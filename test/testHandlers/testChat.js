
var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');

module.exports = function(db){
    var Message = db.model('Message');
    var User = db.model('User');

    var host = process.env.HOST;
    var agent = request.agent(host);

    var user1 = {
        fbId: 'test1234',
        coordinates: [88.23, 75.66]
    };

    var user2 = {
        fbId: 'test2',
        coordinates: [88, 75]
    };

    var uId1;
    var uId2;

    describe('Chat test', function(){

        it('SignIn User1', function (done){

            var url = '/signIn';

            agent
                .post(url)
                .send(user1)
                .expect(200, function(err){

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user1.fbId}, function(err, result){

                            if (err){
                                return done(err);
                            }

                            uId1 = result._id;

                            done(null);

                        });

                });

        });

        it('SignIn User2', function(done){

            var url = '/signIn';

            agent
                .post(url)
                .send(user2)
                .expect(200, function(err){

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user2.fbId}, function(err, result){

                            if (err){
                                return done(err);
                            }

                            uId2 = result._id;

                            done(null);

                        });
                });

        });

        it('User2 send message to User1', function(done){

            var url = '/messages';

            var messageObj = {
                'friendId': uId1.toString(),
                'message': 'test'
            };

            agent
                .post(url)
                .send(messageObj)
                .expect(200, function(err, res){

                    if (err){
                        return done(err);
                    }

                    done(null);

                });

        });

    });

};