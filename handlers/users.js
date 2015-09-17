/**
 * @description User profile management module
 * @module userProfile
 *
 */


var SessionHandler = require('./sessions');
var CONSTANTS = require('../constants/index');
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

    function removeAvatar(avatarName, callback) {

        if (!avatarName.length) {
            return callback();
        }

        imageHandler.removeImageFile(avatarName, CONSTANTS.BUCKETS.AVATAR, function (err) {
            if (err) {
                return callback(err);
            }

            callback();
        });
    }

    function removeGalleryPhotoes(galleryArrayNames, callback) {

        if (!galleryArrayNames.length) {
            return callback();
        }

        async.each(galleryArrayNames,

            function (galleryName, cb) {
                imageHandler.removeImageFile(galleryName, CONSTANTS.BUCKETS.GALLERY, cb);
            },

            function (err) {
                if (err) {
                    return callback(err);
                }
                callback();
            });
    }

    this.signInClient = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/signIn`__
         *
         * This __method__ allows singIn _User_
         *
         * @example Request example:
         *         http://192.168.88.250:8859/singIn
         *
         * @example Body example:
         *
         * {
         *      "fbId": "test1",
         *      "pushToken": "pushTokenTest1",
         *       "os": "APPLE",
         *       "coordinates": [1, 2]
         *
         * }
         *
         * @param {string} fbId - FaceBook Id for signing user
         * @param {string} pushToken - Token for sending push notifications to user's device
         * @param {string} os - type of operation system (using for push notifications)
         * @param {array} coordinates - geoLocation user
         * @method signInClient
         * @instance
         */


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

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/signIn`__
         *
         * This __method__ allows singOut _User_
         *
         * @example Request example:
         *         http://192.168.88.250:8859/singOut
         *
         * @method signOutClient
         * @instance
         */

        session.kill(req, res, next);
    };

    this.getUserById = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows get _User_ profile
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users
         *
         * @example Response example:
         *
         * {
         *  "_id": "55f7dae6e0c966b023c6e831",
         *  "profile": {
         *      "visible": true,
         *      "things": [],
         *      "sexual": "straight",
         *      "relStatus": "single",
         *      "sex": "M"
         *      }
         *  "notification": {
         *          "newMessages": true,
         *          "newFriends": true
         *      }
         * }
         *
         * @method getUserById
         * @instance
         */


        var userId = req.params.id || req.session.uId;

        User
            .findOne({_id: userId},
            {
                fbId: 0,
                __v: 0,
                friends: 0,
                blockList: 0,
                loc: 0
            },
            function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound({message: 'User not found'}));
                }
                res.status(200).send(userModel);
            });
    };

    this.deleteCurrentUser = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows delete _User_ profile
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users
         *
         *
         * @method deleteCurrentUser
         * @instance
         */

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
                    function (cb) {
                        Image
                            .findOne({user: ObjectId(userId)}, function (err, imageModel) {
                                var galleryArrayNames;
                                var avatarName;

                                if (err) {
                                    return cb(err);
                                }

                                if (!imageModel) {
                                    return cb();
                                }
                                avatarName = imageModel.get('avatar');
                                galleryArrayNames = imageModel.get('gallery');

                                async.parallel([

                                        //remove avat from filesystem
                                        function (callback) {
                                            removeAvatar(avatarName, callback);
                                        },

                                        //remove gallery photoes from filesystem
                                        function (callback) {
                                            removeGalleryPhotoes(galleryArrayNames, callback);
                                        },

                                        //remove Image model
                                        function (callback) {
                                            imageModel
                                                .remove(function (err) {
                                                    if (err) {
                                                        return callback(err);
                                                    }

                                                    callback();
                                                });
                                        }
                                    ],

                                    function (err) {
                                        if (err) {
                                            return cb(err);
                                        }
                                        cb();
                                    });


                            })
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

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users
         *
         * @example Body example:
         *
         * {
         *  "profile": {
         *      "visible": true,
         *      "things": [],
         *      "sexual": "straight",
         *      "relStatus": "single",
         *      "sex": "M"
         *      }
         * }
         *
         * @method updateProfile
         * @instance
         */

        var userId = req.session.uId;
        var options = req.body;

        userHelper.getUserById(userId, function (err, userModel) {
            if (err) {
                return next(err);
            }

            userHelper.updateProfile(userModel, options, function (err) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({success: 'Profile updated successfully'});
            });
        });
    };

    this.updateNotificationsSettings = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users/notifications`__
         *
         * This __method__ allows update _User_ notification settings
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users/notifications
         *
         * @example Body example:
         *
         * {
         *  "newFriends":"true",
         *  "newMessages":"false"
         * }
         *
         * @method updateNotificationsSettings
         * @instance
         */

        var userId = req.session.uId;
        var options = req.body;

        if (!options || (!(options.newFriends || (options.newFriends === false)) && !(options.newMessages || (options.newMessages === false)))) {
            return next(badRequests.NotEnParams({message: 'newFriends or newMessages required'}));
        }

        userHelper.getUserById(userId, function (err, userModel) {
            var notification;

            if (err) {
                return next(err);
            }

            notification = userModel.get('notification');

            if (options.newFriends || (options.newFriends === false)) {
                notification.newFriends = options.newFriends;
            }

            if (options.newMessages || (options.newMessages === false)) {
                notification.newMessages = options.newMessages;
            }

            userModel.notification = notification;
            userModel
                .save(function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send('Notifications updated successfully');
                });
        });
    };

    this.findNearestUsers = function (req, res, next) {
        var distance = req.params.d;
        var uId = req.session.uId;

        userHelper.getAllUserbySearchSettings(uId, function(err, user){

            if (err){
                return next(err);
            }

            res.status(200).send(user);

        });

    };

    this.getFriendList = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users/friendList`__
         *
         * This __method__ allows update _User_ notification settings
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users/friendList
         *
         * @example Response example:
         *
         * ["55f938010bc036b01945f1e7", "55f938110bc036b01945d1r5"]
         *
         * @method getFriendList
         * @instance
         */

        var userId = req.session.uId;

        userHelper.getUserById(userId, function (err, userModel) {
            var friends;

            if (err) {
                return next(err);
            }

            friends = userModel.get('friends');

            res.status(200).send(friends);
        });
    };

    this.blockFriend = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/users/blockFriend/:id`__
         *
         * This __method__ allows update _User_ notification settings
         *
         * @example Request example:
         *         http://192.168.88.250:8859/users/blockFriend/55f938010bc036b01945f1e7
         *
         * @method blockFriend
         * @instance
         */

        var userId = req.session.uId;
        var blockedId = req.params.id;

        async.parallel([

                async.apply(userHelper.addToBlockListById, userId, blockedId),
                async.apply(userHelper.addToBlockListById, blockedId, userId)

            ],

            function (err, result) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'User blocked successfully'});
            })
    };



};

module.exports = UserHandler;
