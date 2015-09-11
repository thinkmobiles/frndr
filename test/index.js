'use strict';

var async = require('async');
//var server;
var app;
//var defaults;
var db;

process.env.NODE_ENV = 'test';

app = require('../app')();
db = app.get('db');
var User = db.model('User');
var Like = db.model('Like');
var Message = db.model('Message');
var SearchSettings = db.model('SearchSettings');
var PushTokens = db.model('PushTokens');

describe('Database initialization', function () {
    this.timeout(5000);

    it('Drop the collections', function (done) {
        /*db.dropDatabase(function(err, result){
            if (err){
                return done(err);
            }
            done();
        });*/

        async.waterfall([

                function (cb) {
                    User.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                },

                function (cb) {
                    Like.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                },

                function (cb) {
                    Message.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                },

                function (cb) {
                    SearchSettings.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                },

                function (cb) {
                    PushTokens.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                }
            ],
            function (err) {
                if (err) {
                    return done(err);
                }
                console.log('>>>Drop database successfully')
                done();
            });

    });

    /*it('Test handlers', function () {
     //require('./testHandlers/testUsers')(PostGre, defaults);
     //require('./testHandlers/testLinks')(PostGre, defaults);
     //require('./testHandlers/testTemplates')(PostGre, defaults);
     //require('./testHandlers/testCompanies')(PostGre, defaults);
     //require('./testHandlers/testDocuments')(PostGre, defaults);
     });*/
});
