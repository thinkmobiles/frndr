'use strict';

var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');

module.exports = function (db, defaults) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var Like = db.model('Like');
    var SearchSettings = db.model('SearchSettings');

    var host = process.env.HOST;
    var userAgent = request.agent(host);

    var badUser1 = {
        pushToken: '13455',
        coordinates: [12.23, 56]
    };

    var badUser2 = {
        fbId: 'test2',
        pushToken: 'qwerty',
        coordinates: [182, -95]
    };

    var user1 = {
        fbId: 'test1',
        pushToken: "125478963",
        os: 'APPLE',
        coordinates: [88.23, 75.66]
    };

    var user2 = {
        fbId: 'test2',
        pushToken: "996633",
        os: 'APPLE',
        coordinates: [88, 75]
    };

    var newpushToken = "12345";
    var newCoordinates = [10, 25];
    var newUserName = 'Gandalf';
    var newAge = 743;
    var newSex = 'f';
    var newJobTitle = 'wizard';
    var newCoordinates1 = [110, 80];

    var newSearchDistance = 40;
    var newRelationShip = ['couple', 'family'];
    var newAgeRange = {
        min: 28,
        max: 32
    };


    var uId1;
    var uId2;

    describe('Test users', function () {

            it('SignUp Bad parameters', function (done) {

                var url = '/signIn';

                userAgent
                    .post(url)
                    .send(badUser1)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        expect(res.status).to.equals(400);

                        done();
                    });

            });

            it('SignIn Bad coordinates', function(done){
                var url = '/signIn';

                userAgent
                    .post(url)
                    .send(badUser2)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        expect(res.status).to.equals(400);

                        done();
                    });
            });

            it('SignUp user1', function (done) {
                var url = '/signIn';

                userAgent
                    .post(url)
                    .send(user1)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        User
                            .findOne({fbId: user1.fbId})
                            .exec(function (err, resultUser) {
                                var user = resultUser.toJSON();

                                if (err) {
                                    return done(err);
                                }

                                expect(user).to.instanceOf(Object);
                                expect(user.loc.coordinates[0]).to.equals(user1.coordinates[0]);
                                expect(user.loc.coordinates[1]).to.equals(user1.coordinates[1]);

                                uId1 = user._id;

                                PushTokens
                                    .findOne({user: uId1}, function (err, resToken) {
                                        if (err) {
                                            return done(err);
                                        }

                                        expect(resToken.token).to.equals(user1.pushToken);

                                        done();
                                    });
                            });

                        expect(res.status).to.equals(200);
                    });
            });

            it('SignUp user2', function (done) {
                var url = '/signIn';

                userAgent
                    .post(url)
                    .send(user2)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        User
                            .findOne({fbId: user2.fbId})
                            .exec(function (err, resultUser) {
                                var user = resultUser.toJSON();

                                if (err) {
                                    return done(err);
                                }

                                expect(user).to.instanceOf(Object);
                                expect(user.loc.coordinates[0]).to.equals(user2.coordinates[0]);
                                expect(user.loc.coordinates[1]).to.equals(user2.coordinates[1]);

                                uId2 = user._id;

                                PushTokens
                                    .findOne({user: uId2}, function (err, resToken) {
                                        if (err) {
                                            return done(err);
                                        }

                                        expect(resToken.token).to.equals(user2.pushToken);

                                        done();
                                    });
                            });

                        expect(res.status).to.equals(200);
                    });
            });

            it('SingOut', function (done) {

                var url = '/signOut';


                userAgent
                    .get(url)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        expect(res.status).to.equals(200);

                        done();
                    });
            });

            it('signIn User1', function (done) {

                var url = '/signIn';

                user1.pushToken = newpushToken;
                user1.coordinates[0] = newCoordinates[0];
                user1.coordinates[1] = newCoordinates[1];

                userAgent
                    .post(url)
                    .send(user1)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        User
                            .findOne({fbId: user1.fbId})
                            .exec(function (err, resultUser) {
                                var user = resultUser.toJSON();

                                if (err) {
                                    return done(err);
                                }

                                expect(user).to.instanceOf(Object);
                                expect(user.loc.coordinates[0]).to.equals(newCoordinates[0]);
                                expect(user.loc.coordinates[1]).to.equals(newCoordinates[1]);

                                uId1 = user._id;

                                expect(res.status).to.equals(200);

                                PushTokens
                                    .findOne({user: uId1}, function (err, resToken) {
                                        if (err) {
                                            return done(err);
                                        }

                                        expect(resToken.token).to.equals(newpushToken);

                                        done();
                                    });
                            });


                    });
            });

            it('Get current user', function (done) {

                var url = '/users/' + uId1.toString();

                userAgent
                    .get(url)
                    .end(function (err, res) {

                        var user = res.body;

                        if (err) {
                            done(err);
                        }


                        expect(user).to.instanceOf(Object);
                        expect(user._id.toString()).to.equals(uId1.toString());
                        expect(user.loc.coordinates[0]).to.equals(newCoordinates[0]);
                        expect(user.loc.coordinates[1]).to.equals(newCoordinates[1]);

                        done();

                    });

            });

            it('Update user profile', function(done){
                var updateobj = {
                    profile: {
                        name: newUserName,
                        age: newAge,
                        sex: newSex,
                        jobTitle: newJobTitle
                    },
                    coordinates: newCoordinates1
                };

                var url = '/users';

                userAgent
                    .put(url)
                    .send(updateobj)
                    .expect(200, function(err, res){

                        if (err){
                            return done(err);
                        }

                        User
                            .findOne({_id: uId1}, function(err, resultUser){

                                if (err){
                                    return done(err);
                                }

                                expect(resultUser).to.instanceOf(Object);
                                expect(resultUser.profile.name).to.equals(newUserName);
                                expect(resultUser.profile.age).to.equals(newAge);
                                expect(resultUser.profile.sex).to.equals(newSex);
                                expect(resultUser.profile.jobTitle).to.equals(newJobTitle);
                                expect(resultUser.loc.coordinates[0]).to.equals(newCoordinates1[0]);
                                expect(resultUser.loc.coordinates[1]).to.equals(newCoordinates1[1]);

                                done();
                            });

                    });

            });

            it('User1 likes User2', function(done){
                var model;
                var url = '/users/like/' + uId2.toString();

                userAgent
                    .get(url)
                    .expect(200, function(err){

                        if (err){
                            return done(err);
                        }

                        Like.findOne({user: uId1}, function(err, resultModel1){

                            if (err){
                                return done(err);
                            }

                            model = resultModel1.toJSON();

                            expect(model).to.instanceOf(Object);
                            expect(model.likes).to.instanceOf(Array);
                            expect(model.likes.length).to.equals(1);
                            expect(model.likes[0]).to.equals(uId2.toString());

                           done(null);

                        });

                    });
            });

            it('signIn User2', function (done) {

                var url = '/signIn';

                user2.pushToken = newpushToken;
                user2.coordinates[0] = newCoordinates[0];
                user2.coordinates[1] = newCoordinates[1];

                userAgent
                    .post(url)
                    .send(user2)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        User
                            .findOne({fbId: user2.fbId})
                            .exec(function (err, resultUser) {
                                var user = resultUser.toJSON();

                                if (err) {
                                    return done(err);
                                }

                                expect(user).to.instanceOf(Object);
                                expect(user.loc.coordinates[0]).to.equals(newCoordinates[0]);
                                expect(user.loc.coordinates[1]).to.equals(newCoordinates[1]);

                                uId2 = user._id;

                                expect(res.status).to.equals(200);

                                PushTokens
                                    .findOne({user: uId2}, function (err, resToken) {
                                        if (err) {
                                            return done(err);
                                        }

                                        expect(resToken.token).to.equals(newpushToken);

                                        done();
                                    });
                            });


                    });
            });

            it('User2 get search settings', function(done){
                var url = '/users/searchSettings/';

                userAgent
                    .get(url)
                    .expect(200, function(err, res){

                        if (err){
                            done(err);
                        }

                        var settings = res.body;

                        expect(settings).to.instanceOf(Object);
                        expect(settings.distance).to.equals(20);
                        expect(settings.sexual).to.equals('any');
                        expect(settings.ageRange).to.instanceOf(Object);
                        expect(settings.ageRange.min).to.equals(25);
                        expect(settings.ageRange.max).to.equals(40);

                        done(null);
                    });
            });

            it('User2 change search settings', function(done){

                var url = '/users/searchSettings/';
                var updateObj = {
                    distance: newSearchDistance,
                    relationship: newRelationShip,
                    ageRange: newAgeRange
                };

                userAgent
                    .put(url)
                    .send(updateObj)
                    .expect(200, function(err){

                        if (err){
                            done(err);
                        }

                        SearchSettings
                            .findOne({user: uId2}, function(err, resultSettings){

                                if (err){
                                    done(err);
                                }

                                expect(resultSettings).to.instanceOf(Object);
                                expect(resultSettings.distance).to.equals(newSearchDistance);
                                expect(resultSettings.relationship).to.instanceOf(Array);
                                expect(resultSettings.relationship.length).to.equals(2);
                                expect(resultSettings.relationship[0]).to.equals(newRelationShip[0]);
                                expect(resultSettings.relationship[1]).to.equals(newRelationShip[1]);
                                expect(resultSettings.ageRange).to.instanceOf(Object);
                                expect(resultSettings.ageRange.min).to.equals(newAgeRange.min);
                                expect(resultSettings.ageRange.max).to.equals(newAgeRange.max);

                                done(null);

                            });


                    });

            });

            it('User2 likes User1', function(done){
                var model;
                var url = '/users/like/' + uId1.toString();

                userAgent
                    .get(url)
                    .expect(200, function(err){

                        if (err){
                            return done(err);
                        }

                        Like.findOne({user: uId2}, function(err, resultModel){

                            if (err){
                                return done(err);
                            }

                            model = resultModel.toJSON();

                            expect(model).to.instanceOf(Object);
                            expect(model.likes).to.instanceOf(Array);
                            expect(model.likes.length).to.equals(1);
                            expect(model.likes[0]).to.equals(uId1.toString());

                            User
                                .findOne({_id: uId1}, function(err, resultUser1){
                                    if (err){
                                        return done(err);
                                    }

                                    expect(resultUser1).to.instanceOf(Object);
                                    expect(resultUser1.friends).to.instanceOf(Array);
                                    expect(resultUser1.friends.length).to.equals(1);
                                    expect(resultUser1.friends[0]).to.equals(uId2.toString());


                                    User
                                        .findOne({_id: uId2}, function(err, resultUser2) {
                                            if (err) {
                                                return done(err);
                                            }

                                            expect(resultUser2).to.instanceOf(Object);
                                            expect(resultUser2.friends).to.instanceOf(Array);
                                            expect(resultUser2.friends.length).to.equals(1);
                                            expect(resultUser2.friends[0]).to.equals(uId1.toString());

                                            done(null);
                                        });
                                });

                        });

                    });
            });

            it('Delete User', function(done){

                var url = '/users/' + uId1.toString();

                userAgent
                    .delete(url)
                    .expect(200, function(err, res){

                        if (err){
                            return done(err);
                        }

                        User
                            .findOne({_id: uId1}, function(err, resultUser){

                                if (err){
                                    return done(err);
                                }

                                expect(resultUser).to.equals(null);

                                PushTokens
                                    .findOne({user: uId1}, function(err, resultToken){

                                        if (err){
                                            return done(err);
                                        }

                                        expect(resultToken).to.equals(null);

                                        done();

                                    });
                            });

                    });
            });
    });
};