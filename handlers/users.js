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
var MessageHandler = require('./messages');


var UserHandler = function (app, db) {
    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');
    var Like = db.model('Like');
    var Image = db.model('Image');
    var Message = db.model('Message');
    var session = new SessionHandler();
    var userHelper = require('../helpers/user')(db);
    var ObjectId = mongoose.Types.ObjectId;
    var imageHandler = new ImageHandler(db);
    var messageHandler = new MessageHandler(app, db);

    function removeAvatar(avatarName, callback) {

        if (!avatarName.length) {
            return callback();
        }

        imageHandler.removeImageFile(avatarName, CONSTANTS.BUCKETS.IMAGES, function (err) {
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
                imageHandler.removeImageFile(galleryName, CONSTANTS.BUCKETS.IMAGES, cb);
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
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/signIn`__
         *
         * This __method__ allows signIn _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/signIn
         *
         * @example Body example:
         *
         * {
         *      "fbId": "test1",
         *       "coordinates": [1, 2]
         * }
         *
         * @example Response example:
         *
         *  {
         *      "success": "Login successful",
         *      "userId": "561229dd419a2d2c0233cb2f",
         *      "haveAvatar": true
         *  }
         *
         * @param {string} fbId - FaceBook Id for signing user
         * @param {array} coordinates - geoLocation user
         * @method signInClient
         * @instance
         */

        var options = req.body;
        var haveAvatar = false;

        if (!options || !options.fbId) {
            return next(badRequests.NotEnParams({reqParams: 'fbId'}));
        }

        async.waterfall([

                function (cb) {
                    User
                        .findOne({fbId: options.fbId})
                        .populate({path:'images', select:'-_id avatar'})
                        .exec(function (err, userModel) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, userModel);
                        });
                },

                function (userModel, cb) {
                    var avatarName;

                    if (!userModel) {
                        userHelper.createUser(options, cb);
                    } else {
                        avatarName = userModel.images.get('avatar');

                        if (avatarName && avatarName.length){
                            haveAvatar = true;
                        }

                        userHelper.updateUser(userModel, options, cb);
                    }

                }

            ],
            function (err, uId) {
                if (err) {
                    return next(err);
                }

                return session.register(req, res, uId.toString(), haveAvatar);
            });

    };

    this.signOut = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/signOut`__
         *
         * This __method__ allows signOut _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/signOut
         *
         * @method signOutClient
         * @instance
         */

        session.kill(req, res, next);
    };

    this.addPushToken = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/pushToken`__
         *
         * This __method__ allows to add _Push Token_ to _User_
         *
         * @example Body example:
         *
         * {
         *    "pushToken": "fsdfsf",
         *    "os": "APPLE"
         *  }
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/pushToker
         *
         * @param {string} pushToken - Token for sending Push Notifications
         * @param {string} os - Type of device operation system
         *
         * @method addPushToken
         * @instance
         */

        var body = req.body;
        var userId = req.session.uId;

        if (!body || !body.pushToken || !body.os) {
            return next(badRequests.NotEnParams({reqParams: 'pushToken and os'}));
        }

        userHelper.addPushToken(userId, body.pushToken, body.os, function (err) {

            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'Push token saved successfully'});

        });

    };

    this.getUserById = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows get _User_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users
         *
         * @example Response example:
         *
         * {
         *      "_id": "5603acdcbc68399017c2c3e3",
         *      "notification": {
         *          "newMessages": false,
         *          "newFriends": true
         *       },
         *       "profile": {
         *          "age": 25,
         *          "bio": "Some biography",
         *          "jobTitle": "Doctor",
         *          "name": "Petrovich",
         *          "smoker": true,
         *          "visible": true,
         *          "things": [
         *                      "tenis",
         *                      "box",
         *                      "cars"
         *                    ],
         *          "sexual": "straight",
         *          "relStatus": "single",
         *          "sex": "M"
         *          }
         *       }
         *
         * @method getUserById
         * @instance
         */


        var userId = req.params.id || req.session.uId;

        if (req.params.id && !CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
            return next(badRequests.InvalidValue({value: userId, param: 'id'}));
        }

        User
            .findOne({_id: ObjectId(userId)},
            {
                fbId: 0,
                __v: 0,
                friends: 0,
                blockList: 0,
                loc: 0,
                images: 0
            },
            function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound({target: 'User'}));
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
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows delete _User_ account
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users
         *
         *
         * @method deleteCurrentUser
         * @instance
         */

        var userId = req.session.uId;

        userHelper.deleteUserById(userId, function (err) {
            var objectUserId = ObjectId(userId);

            if (err) {
                return next(err);
            }

            async.parallel([

                    //remove PushToken model
                    function (cb) {
                        PushTokens.remove({user: objectUserId}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //remove SearchSettings model
                    function (cb) {
                        SearchSettings.remove({user: objectUserId}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //remove Like model
                    function (cb) {
                        Like.remove({user: objectUserId}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    //try to delete all user images from Filesystem
                    function (cb) {
                        Image
                            .findOne({user: objectUserId}, function (err, imageModel) {
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

                                        //remove avatar from filesystem
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
                    },

                    //try to remove Messages, or update show array in them
                    function (cb) {
                        messageHandler.deleteMessages(userId, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    }
                ],

                function (err) {
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
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users
         *
         * @example Body example:
         *
         * {
         *      "coordinates": [15, 25],
         *      "profile": {
         *          "name": "Petrovich",
         *          "age": "25",
         *          "relStatus": "single",
         *          "jobTitle": "Doctor",
         *          "smoker": "true",
         *          "sexual": "straight",
         *          "things": ["tennis", "box", "cars"],
         *          "bio": "Some biography",
         *          "visible": "true",
         *          "sex": "M"
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
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/notifications`__
         *
         * This __method__ allows update _User's_ notification settings
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/notifications
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
            return next(badRequests.NotEnParams({reqParams: 'newFriends or newMessages'}));
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

                    res.status(200).send({success: 'Notifications updated successfully'});
                });
        });
    };

    this.findNearestUsers = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `users/find/:page?`__
         *
         * This __method__ allows find nearest `FRNDR` user's to current _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/find/2
         *
         * @example Response example:
         *
         * [
         *   {
         *      "userId": "560919c349d6a608179610c5",
         *      "avatar": "http://projects.thinkmobiles.com:8859/uploads/development/images/560919cb49d6a608179610c7.png",
         *      "name": "Petrovich",
         *      "age": 25,
         *      "distance": 0,
         *      "sexual": "straight",
         *      "jobTitle": "Doctor",
         *      "smoker": false,
         *      "likes": [
         *          "tenis",
         *          "box",
         *          "cars"
         *      ],
         *      "bio": "Some biography",
         *      "gallery": [
         *          "http://projects.thinkmobiles.com:8859/uploads/development/images/560919cd49d6a608179610c8_small.png"
         *      ]
         *   }
         * ]
         *
         * @method findNearestUsers
         * @instance
         */

        var uId = req.session.uId;
        var page = req.params.page || 1;

        if (page < 1 || isNaN(page)) {
            return next(badRequests.InvalidValue({value: page, param: 'page'}));
        }

        userHelper.getAllUsersBySearchSettings(uId, page, function (err, user) {

            if (err) {
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
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/friendList/:page?`__
         *
         * This __method__ allows to get _User's_ friends list
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/friendList
         *
         * @example Response example:
         *
         * [
         *   {
         *      "friendId": "55ffc48dcc6f0ec80b4c0522",
         *      "newFriend": "false",
         *      "message": "123456789",
         *      "avatar": "http://projects.thinkmobiles.com:8859/uploads/development/images/55f91b11233e6ae311af1ca1_small.png"
         *   },
         *   {
         *      "friendId": "55ffc48dcc6f0ec80b4c0521",
         *      "newFriend": "true",
         *      "message": "New friend. Say Hello.",
         *      "avatar": ""
         *   }
         * ]
         *
         * @method getFriendList
         * @instance
         */

        var userId = req.session.uId;
        var pageCount = req.params.page || 1;
        var resultArray = [];

        if (isNaN(pageCount) || pageCount < 1) {
            return next(badRequests.InvalidValue({value: pageCount, param: 'page'}));
        }

        userHelper.getUserById(userId, function (err, userModel) {
            var friends;
            var indexFrom = 0;
            var indexTo;

            if (err) {
                return next(err);
            }

            friends = userModel.get('friends');

            if (friends.length > CONSTANTS.LIMIT.FRIENDS * pageCount) {
                indexFrom = friends.length - CONSTANTS.LIMIT.FRIENDS * pageCount;
                indexTo = CONSTANTS.LIMIT.FRIENDS;

            } else {
                indexTo = friends.length - CONSTANTS.LIMIT.FRIENDS * (pageCount - 1);
            }

            friends = friends.splice(indexFrom, indexTo);

            async.eachSeries(friends,

                function (friendId, cb) {
                    var chatId = messageHandler.computeChatId(userId, friendId);

                    Message.find(
                        {
                            $and: [
                                {chatId: chatId},
                                {show: {$in: [userId]}}

                            ]
                        },

                        {__v: 0, chatId: 0, show: 0},

                        {
                            sort: {
                                date: -1
                            },
                            limit: 1
                        },

                        function (err, messageModelsArray) {
                            var msg;
                            var newFriend = false;

                            if (err) {
                                return cb(err);
                            }

                            //TODO: change for old friend when cleared chat history
                            if (!messageModelsArray.length) {
                                msg = 'New friend. Say Hello.';
                                newFriend = true;
                            } else {
                                msg = messageModelsArray[0].get('text');
                            }

                            Image.findOne({user: ObjectId(friendId)}, function (err, imageModel) {
                                var avatarName;
                                var avatarUrl;
                                var resultObj = {};

                                if (err) {
                                    return cb(err);
                                }

                                if (imageModel) {
                                    avatarName = imageModel.get('avatar');

                                    if (avatarName === ''){
                                        resultObj.avatar = '';
                                    } else {
                                        avatarName += '_small';
                                        avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                                        resultObj.avatar = avatarUrl;
                                    }

                                } else {
                                    resultObj.avatar = '';
                                }

                                resultObj.friendId = friendId;
                                resultObj.newFriend = newFriend;
                                resultObj.message = msg;

                                resultArray.push(resultObj);
                                cb();
                            });

                        })
                },

                function (err) {
                    if (err) {
                        return next(err);
                    }

                    resultArray.reverse(); //new friend at start of array

                    res.status(200).send(resultArray);
                });

        });
    };

    this.blockFriend = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/blockFriend/:id`__
         *
         * This __method__ allows block _User's_ friend
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/blockFriend/55f938010bc036b01945f1e7
         *
         * @method blockFriend
         * @instance
         */

        var userId = req.session.uId;
        var blockedId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(blockedId)){
            return next(badRequests.InvalidValue({value: blockedId, param: 'id'}));
        }

        async.parallel([
                async.apply(userHelper.addToBlockListById, userId, blockedId),
                async.apply(userHelper.addToBlockListById, blockedId, userId)
            ],

            function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'User blocked successfully'});
            })
    };

    this.getFriendProfile = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/friendProfile/:id`__
         *
         * This __method__ allows get _friends profile_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/friendProfile/5603acdcbc68399017c2c3e3
         *
         * @example Response example:
         *
         *  {
         *      "_id": "5603acdcbc68399017c2c3e3",
         *      "images": {
         *          "avatar": {
         *              "fileName": "56091c0c49d6a608179610df",
         *              "url": "http://projects.thinkmobiles.com:8859/uploads/development/images/56091c0c49d6a608179610df.png"
         *          },
         *          "gallery": [
         *              {
         *                  "fileName": "56091c1049d6a608179610e0",
         *                  "url": "http://projects.thinkmobiles.com:8859/uploads/development/images/56091c1049d6a608179610e0_small.png"
         *              },
         *              {
         *                  "fileName": "56091c1149d6a608179610e1",
         *                  "url": "http://projects.thinkmobiles.com:8859/uploads/development/images/56091c1149d6a608179610e1_small.png"
         *              },
         *              {
         *                  "fileName": "56091c1149d6a608179610e2",
         *                  "url": "http://projects.thinkmobiles.com:8859/uploads/development/images/56091c1149d6a608179610e2_small.png"
         *              }
         *          ]
         *      },
         *      "profile": {
         *          "age": 25,
         *          "bio": "Some biography",
         *          "jobTitle": "Doctor",
         *          "name": "Petrovich",
         *          "smoker": true,
         *          "visible": true,
         *          "things": [
         *              "tennis",
         *              "box",
         *              "cars"
         *          ],
         *      "sexual": "straight",
         *      "relStatus": "single",
         *      "sex": "M"
         *      }
         *  }
         *
         * @method getFriendProfile
         * @instance
         */

        var userId = req.session.uId;
        var friendId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(friendId)){
            return next(badRequests.InvalidValue({value: friendId, param: 'id'}));
        }

        User
            .findOne({_id: ObjectId(friendId)}, {__v: 0, loc: 0, blockList: 0, notification: 0, fbId: 0})
            .populate({path: 'images', select: '-_id avatar gallery'})
            .exec(function (err, friendModel) {
                var friendModelJSON;
                var avatarName = '';
                var avatarUrl = '';
                var photoUrl;
                var photoNames;
                var galleryArray = [];
                var images;
                var friends;

                if (err) {
                    return next(err);
                }

                if (!friendModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                friendModelJSON = friendModel.toJSON();
                friends = friendModelJSON.friends;

                if (friends.indexOf(userId) === -1){
                    return next(badRequests.AccessError({message: 'This user is not your friend'}));
                }

                delete friendModelJSON.friends;

                images = friendModelJSON.images;

                if (images.avatar) {
                    avatarName = images.avatar;
                    avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                }

                images.avatar = {
                    fileName: avatarName,
                    url: avatarUrl
                };

                if (images.gallery && images.gallery.length) {
                    photoNames = images.gallery;

                    galleryArray = photoNames.map(function (photoName) {
                        var smallPhotoName = photoName + '_small';

                        photoUrl = imageHandler.computeUrl(smallPhotoName, CONSTANTS.BUCKETS.IMAGES);

                        return {
                            fileName: photoName,
                            url: photoUrl
                        };
                    });

                    images.gallery = galleryArray;
                }

                friendModelJSON.images = images;

                res.status(200).send(friendModelJSON);
            });
    };






    // TODO  TEST (remove in production)

    this.testUser = function (req, res, next) {

        var userModel;

        var userObj = {
            'loc.coordinates': [1, 2],
            "pushToken": "ssss",
            "os": "APPLE",
            profile: {
                sex: 'M',
                age: 33,
                relStatus: 'singleWithBaby',
                smoker: false,
                sexual: 'any'
            }
        };

        for (var i = 0; i < 1000; i++) {
            userObj['fbId'] = 'age' + i;

            userModel = new User(userObj);

            userModel
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }

                });
        }

        res.status(200).send({success: 'Users created successfully'});

    };

};

module.exports = UserHandler;
