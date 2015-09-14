'use strict';

var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');

module.exports = function (db, defaults) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');

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

    var newpushToken = "12345";
    var newCoordinates = [10, 25];
    var newUserName = 'Gandalf';
    var newAge = 743;
    var newSex = 'f';
    var newJobTitle = 'wizard';
    var newCoordinates1 = [110, 80];


    var uId;


    describe('Test users', function () {

        describe('Test session', function () {

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

            it('SignUp user', function (done) {
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

                                uId = user._id;

                                PushTokens
                                    .findOne({user: uId}, function (err, resToken) {
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

            it('signIn', function (done) {

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

                                uId = user._id;

                                expect(res.status).to.equals(200);

                                PushTokens
                                    .findOne({user: uId}, function (err, resToken) {
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

                var url = '/users/' + uId.toString();

                userAgent
                    .get(url)
                    .end(function (err, res) {

                        var user = res.body;

                        if (err) {
                            done(err);
                        }


                        expect(user).to.instanceOf(Object);
                        expect(user._id.toString()).to.equals(uId.toString());
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
                            .findOne({_id: uId}, function(err, resultUser){

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

            it('Delete User', function(done){

                var url = '/users/' + uId.toString();

                userAgent
                    .delete(url)
                    .expect(200, function(err, res){

                        if (err){
                            return done(err);
                        }

                        User
                            .findOne({_id: uId}, function(err, resultUser){

                                if (err){
                                    return done(err);
                                }

                                expect(resultUser).to.equals(null);

                                PushTokens
                                    .findOne({user: uId}, function(err, resultToken){

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
    });
};