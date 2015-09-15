var SessionHandler = require('./sessions');
var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');
var ImageHandler = require('./image');


var UserHandler = function (db) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');
    var Like = db.model('Like');
    var Image = db.model('Image');
    var session = new SessionHandler();
    var userHelper = require('../helpers/user')(db);
    var ObjectId = mongoose.Types.ObjectId;
    var imageHandler = new ImageHandler(db);

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

    this.deleteCurrentUser = function (req, res, next) {
        var userId = req.session.uId;

        userHelper.deleteUserById(userId, function (err) {
            if (err) {
                return next(err);
            }

            async.parallel([

                    //remove PushToken model
                    function (cb) {
                        PushTokens.remove({user: ObjectId(userId)}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //remove SearchSettings model
                    function (cb) {
                        SearchSettings.remove({user: ObjectId(userId)}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //remove Like model
                    function (cb) {
                        Like.remove({user: ObjectId(userId)}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //try to delete all user images from Filesystem
                    function (cb){
                        Image
                            .findOne({user: ObjectId(userId)}, function(err, imageModel){
                                var galleryArrayNames;
                                var avatarName;

                                if (err){
                                    return cb(err);
                                }

                                if (!imageModel){
                                    return cb();
                                }
                                avatarName = imageModel.get('avatar');
                                galleryArrayNames = imageModel.get('gallery');

                                if (!avatarName.length && !galleryArrayNames.length){
                                    return cb();
                                }

                                async.waterfall([

                                    function(waterfallCb){

                                        if (!avatarName.length){
                                            return waterfallCb();
                                        }

                                        imageHandler.removeImageFile(avatarName, 'avatar', function(err){
                                            if (err){
                                                return waterfallCb(err);
                                            }
                                        });
                                    },

                                    function(waterfallCb){

                                        if (!galleryArrayNames.length){
                                            return waterfallCb();
                                        }

                                        async.each(galleryArrayNames,

                                            function(galleryName, eachCb){
                                                imageHandler.removeImageFile(galleryName, 'gallery', eachCb);
                                            },

                                            function(err){
                                                if (err){
                                                    return waterfallCb(err);
                                                }
                                                waterfallCb ();
                                            });
                                    }


                                ],

                                function(err){
                                    if (err){
                                        return cb(err);
                                    }

                                    cb(null, imageModel);
                                });

                            })
                    },

                    //remove Image model
                    function (imageModel, cb) {

                        if (!imageModel){
                            return cb();
                        }

                        imageModel
                            .remove(function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    }
                ],

                function (err, results) {
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
};

module.exports = UserHandler;
