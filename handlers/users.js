var SessionHandler = require('./sessions');
var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var UserHandler = function (db) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var session = new SessionHandler();
    var userHelper = require('../helpers/user')(db);
    var ObjectId = mongoose.Types.ObjectId;
    var searchSettingsModel;

    this.signInClient = function (req, res, next) {
        var options = req.body;

        if (!options || !options.fbId) {
            return next(badRequests.NotEnParams({message: 'fbId'}));
        }

        async.waterfall([

                function (cb) {
                    User
                        .findOne({fbId: options.fbId}, function (err, userModel) {
                            if (err) {
                                return next(err);
                            }
                            cb(null, userModel);
                        });
                },

                function (userModel, cb) {

                    if (!userModel) {
                        userHelper.createUser(options, cb);
                    } else {
                        userHelper.updateUser(userModel, options, cb);
                    }

                }

            ],
            function (err, uId) {
                if (err) {
                    return next(err);
                }

                return session.register(req, res, uId.toString());
            });

    };

    this.signOut = function (req, res, next) {
        session.kill(req, res, next);
    };

    this.getUserById = function (req, res, next) {
        var userId = req.params.id || req.session.uId;

        userHelper.getUserById(userId, function (err, userModel) {
            if (err) {
                return next(err);
            }
            res.status(200).send(userModel);
        })
    };

    this.deleteUserById = function (req, res, next) {
        var userId = req.params.id;

        userHelper.deleteUserById(userId, function (err) {
            if (err) {
                return next(err);
            }

            PushTokens.remove({user: ObjectId(userId)}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'User was removed successfully'});
            });
        })
    };

    this.updateProfile = function (req, res, next) {
        var userId = req.session.uId;
        var options = req.body;

        User
            .findOne({_id: userId}, function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound({message: 'User not found'}));
                }

                userHelper.updateProfile(userModel, options, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'Profile updated successfully'});
                });
            });
    };

    this.findNearestUsers = function(req, res, next){
        var distance = req.params.d;
        var uId = req.session.uId;

        userHelper.getAllUserByGeoLocation(uId, distance, function(err, resultUser){

            if (err){
                return next(err);
            }

            res.status(200).send(resultUser);

        });

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
