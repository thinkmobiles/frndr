var SessionHandler = require('./sessions');
var async = require('async');
var badRequests = require('../helpers/badRequests');

var UserHandler = function (db) {
    var User = db.model('User');
    var session = new SessionHandler();

    function prepareSaveData(data) {
        var saveData = {};

        if (data.fbId) {
            saveData.fbId = data.fbId;
        }
        if (data.coordinates) {
            saveData.loc = {};
            saveData.loc.coordinates = data.coordinates;
        }

        return saveData;
    }

    this.signInClient = function (req, res, next) {
        var options = req.body;
        var saveData;
        var err;

        saveData = prepareSaveData(options);

        if (!options || !options.fbId || (Object.keys(saveData) === 0)) {
            err = new Error('Bad Request');
            err.status = 400;
            return next(err);
        }

        async.waterfall([

                function (cb) {
                    User
                        .findOne({fbId: saveData.fbId}, function (err, userModel) {
                            if (err) {
                                return next(err);
                            }
                            if (!userModel) {
                                userModel = new User(saveData);
                            } else {
                                userModel.set(saveData);
                            }
                            cb(null, userModel);
                        });
                },

                function (userModel, cb) {

                    userModel.save(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    })
                },

                function (userModel, cb) {
                    //pushTokens

                    cb(null, userModel);
                }
            ],
            function (err, userModel) {
                if (err) {
                    return next(err);
                }
                return session.register(req, res, userModel._id.toString());
            });

    };

    this.signOut = function (req, res, next) {
        session.kill(req, res, next);
    };

    this.getCurrentUser = function (req, res, next) {
        var userId = req.session.userId;

        User
            .findOne({_id: userId}, function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound());
                }
                res.status(200).send(userModel);
            })
    };

    this.getUserById = function (req, res, next) {
        var fbId = req.params.id;

        User
            .findOne({fbId: fbId}, function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound());
                }
                res.status(200).send(userModel);
            })
    };

    this.likeUserById = function (req, res, next) {
        var userId = req.session.userId;
        var likeUserId = req.body.likeId;

        if (!likeUserId) {
            return next(badRequests.NotEnParams({require: 'likeId'}));
        }

        //res.status(201).send({success:'You like successfull'});
    };
};

module.exports = UserHandler;
