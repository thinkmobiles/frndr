'use strict';

var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');

var badRequests = require('../../helpers/badRequests');
var notEnParamsMessage = badRequests.NotEnParams().message;

module.exports = function (db, defaults) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');

    var host = process.env.HOST;
    var userAgent = request.agent(host);

    var user1 = {
        fbId: 'test1',
        pushToken: "125478963",
        coordinates: [88.23, 75.66]
    };


    describe('Test users', function () {

        describe('Test session', function () {

            var url = '/signIn';

            it('SignUp user', function (done) {

                userAgent
                    .post(url)
                    .send(user1)
                    .end(function (err, res) {

                        if (err) {
                            return done(err);
                        }

                        User
                            .findOne({fbId: user1.fbId})
                            .exec(function(err, resultUser){
                                var user = resultUser.toJSON();

                                if (err){
                                    done(err);
                                }

                                expect(user).to.instanceOf(Object);
                                expect(user.loc.coordinates[0]).to.equals(user1.coordinates[0]);
                                expect(user.loc.coordinates[1]).to.equals(user1.coordinates[1]);

                            });

                        expect(res.status).to.equals(200);

                        done();
                    });
            });




        });
    });
};