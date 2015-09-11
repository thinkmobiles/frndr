var async = require('async');

var DbHandler = function (db) {
    var User = db.model('User');
    var Like = db.model('Like');
    var Message = db.model('Message');
    var SearchSettings = db.model('SearchSettings');
    var PushTokens = db.model('PushTokens');

    this.dropCollections = function(callback){
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
                    return callback(err);
                }
                console.log('>>>Drop database successfull');
                callback();
            });
    }
};

module.exports = DbHandler;

