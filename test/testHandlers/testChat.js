
var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');

module.exports = function(db){
    var Messages = db.model('Messages');
    var User = db.model('User');

    var host = process.env.HOST;
    var agent = request.agent(host);

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

    var uId1;
    var uId2;

    describe('Chat test', function(){

        it('SignIn User1', function (done){

            var url = '/singIn';

            agent
                .post(url)
                .send(user1)
                .expect(200, function(err){

                    if (err) {
                        return done(err);
                    }

                    done(null);

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

                    done(null);

                });

        });



    });

};