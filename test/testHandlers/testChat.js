
var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');

module.exports = function(db){

    'use strict';

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

        before('SignIn users', function(done){
            var url = '/signIn/';

            async
                .series([
                    function(cb){
                        agent
                            .post(url)
                            .send(user1)
                            .end(function(err, res){

                                if (err){
                                    return cb(err);
                                }

                                uId1 = res.body.userId;

                                cb(null);

                            });
                    },

                    function(cb){
                        agent
                            .post(url)
                            .send(user2)
                            .end(function(err, res){

                                if (err){
                                    return cb(err);
                                }

                                uId2 = res.body.userId;

                                cb(null);

                            });
                    }
                ], function(err){

                    if (err){
                        return done(err);
                    }

                    done(null);

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

        it('User2 get chat list', function(done){

            var url = '/messages/' + uId1.toString();
            var body;

            agent
                .get(url)
                .expect(200, function(err, res){

                    if (err){

                        return done(err);

                    }

                    body = res.body;

                    expect(body).to.instanceof(Array);
                    expect(body[0]).to.instanceof(Object);
                    expect(body[0]).to.have.property('_id');
                    expect(body[0]).to.have.property('owner');
                    expect(body[0]).to.have.property('text');
                    expect(body[0]).to.have.property('date');

                    done();

                });

        });

        it('User2 clear chat history', function(done){

            var url = '/messages';

            agent
                .delete(url)
                .send({'friendId': uId1.toString()})
                .expect(200, function(err){

                    if (err){
                        return done(err);
                    }

                    done(null);

                });

        });

        it('User2 get chat list', function(done){

            var url = '/messages/' + uId1.toString();
            var body;

            agent
                .get(url)
                .expect(200, function(err, res){

                    if (err){

                        return done(err);

                    }

                    body = res.body;

                    expect(body).to.instanceof(Array);
                    expect(body.length).to.equals(0);

                    done();

                });


        });

        it('signIn user1', function(done){
            var url = '/signIn';

            agent
                .post(url)
                .send(user1)
                .expect(200, function(err){

                    if (err){
                        return done(err);
                    }

                    done(null);

                });
        });

        it('User1 get chat list', function(done){

            var url = '/messages/' + uId2.toString();
            var body;

            agent
                .get(url)
                .expect(200, function(err, res){

                    if (err){

                        return done(err);

                    }

                    body = res.body;

                    expect(body).to.instanceof(Array);
                    expect(body[0]).to.instanceof(Object);
                    expect(body[0]).to.have.property('_id');
                    expect(body[0]).to.have.property('owner');
                    expect(body[0]).to.have.property('text');
                    expect(body[0]).to.have.property('date');

                    done();

                });

        });

        it('User1 clear all chat history', function(done){

            var url = '/messages/all';

            agent
                .delete(url)
                .expect(200, function(err){
                    if (err){
                        return done(err);
                    }

                    done(null);
                });

        });

        it('User1 get chat history with friend User2', function(done){

            var url = '/messages/' + uId2.toString();
            var body;

            agent
                .get(url)
                .expect(200, function(err, res){

                    if (err){
                        return done(err);
                    }

                    body = res.body;

                    expect(body).to.instanceof(Array);
                    expect(body.length).to.equals(0);

                    done(null);

                });

        });


    });

};