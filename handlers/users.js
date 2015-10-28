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
    
    'use strict';

    var User = db.model('User');
    var Image = db.model('Image');
    var Message = db.model('Message');
    var Contact = db.model('Contact');
    var PushToken = db.model('PushTokens');
    var session = new SessionHandler();
    var userHelper = require('../helpers/user')(app, db);
    var ObjectId = mongoose.Types.ObjectId;
    var imageHandler = new ImageHandler(db);
    var messageHandler = new MessageHandler(app, db);
    var io = app.get('io');

    this.signInClient = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/signIn`__
         *
         * This __method__ allows signIn _User_
         *
         * @example Request example:
         *         146.148.120.34:8859/signIn
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
         *      "haveAvatar": true,
         *      "firstLogin": false
         *  }
         *
         * @param {string} fbId - FaceBook Id for signing user
         * @param {array} coordinates - geoLocation user
         * @param {boolean} haveAvatar - if user has uploaded avatar then `haveAvatar = true`
         * @param {boolean} firstLogin - if user has signIn first time then `firstLogin = true`
         *
         * @method signInClient
         * @instance
         */

        var options = req.body;
        var haveAvatar = false;
        var firstLogin = false;

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
                        firstLogin = true;
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

                return session.register(req, res, uId.toString(), haveAvatar, firstLogin);
            });

    };

    this.signOut = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/signOut`__
         *
         * This __method__ allows signOut _User_
         *
         * @example Request example:
         *         146.148.120.34:8859/signOut
         *
         * @method signOutClient
         * @instance
         */

        var body = req.body;
        var userId = req.session.uId;
        var deviceId;

        if (!body.deviceId){
            return next(badRequests.NotEnParams({reqParams: 'deviceId'}));
        }

        deviceId = body.deviceId;

        PushToken
            .remove({userId: userId, deviceId: deviceId}, function(err){

                if (err){
                    return next(err);
                }

                session.kill(req, res, next);

            });

    };

    this.addPushToken = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users/pushToken`__
         *
         * This __method__ allows to add _Push Token_ to _User_
         *
         * @example Body example:
         *
         * {
         *    "pushToken": "fsdfsf",
         *    "os": "APPLE",
         *    "deviceId":"hjkfdsjskjhfeb"
         *  }
         *
         * @example Request example:
         *         146.148.120.34:8859/users/pushToken
         *
         * @param {string} pushToken - Token for sending Push Notifications
         * @param {string} os - Type of device operation system
         * @param {string} deviceId - Unique device id
         *
         * @method addPushToken
         * @instance
         */

        var body = req.body;
        var userId = req.session.uId;

        if (!body || !body.pushToken || !body.os || !body.deviceId) {
            return next(badRequests.NotEnParams({reqParams: 'pushToken and os and deviceId'}));
        }

        userHelper.addPushToken(userId, body.deviceId, body.pushToken, body.os, function (err) {

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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows get _User_ profile
         *
         * @example Request example:
         *         146.148.120.34:8859/users
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
         *          "sexual": "Straight",
         *          "relStatus": "Single",
         *          "sex": "Male"
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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows delete _User_ account
         *
         * @example Request example:
         *         146.148.120.34:8859/users
         *
         *
         * @method deleteCurrentUser
         * @instance
         */

        var userId = req.session.uId;
        var imageId;

        User
            .findOne({_id: userId}, {images: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.NotFound({target: 'User'}));
                }

                imageId = resultModel.images;

                userHelper.deleteUserById(userId, imageId, function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'User was removed successfully'});
                });
            });
    };

    this.updateProfile = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users`__
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         146.148.120.34:8859/users
         *
         * @example Body example:
         *
         * {
         *      "coordinates": [15, 25],
         *      "profile": {
         *          "name": "Petrovich",
         *          "age": "25",
         *          "relStatus": "Single",
         *          "jobTitle": "Doctor",
         *          "smoker": true,
         *          "sexual": "Straight",
         *          "things": ["tennis", "box", "cars"],
         *          "bio": "Some biography",
         *          "visible": true,
         *          "sex": "Male"
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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users/notifications`__
         *
         * This __method__ allows update _User's_ notification settings
         *
         * @example Request example:
         *         146.148.120.34:8859/users/notifications
         *
         * @example Body example:
         *
         * {
         *  "newFriends": true,
         *  "newMessages": false
         * }
         *
         * @method updateNotificationsSettings
         * @instance
         */

        var userId = req.session.uId;
        var options = req.body;

        if (!options || !(options.hasOwnProperty('newFriends') || options.hasOwnProperty('newMessages'))) {
            return next(badRequests.NotEnParams({reqParams: 'newFriends or newMessages'}));
        }

        userHelper.getUserById(userId, function (err, userModel) {
            var notification;

            if (err) {
                return next(err);
            }

            notification = userModel.get('notification');

            if (options.hasOwnProperty('newFriends')){

                if (typeof !!options.newFriends !== 'boolean') {
                    return next(badRequests.InvalidValue({value: options.newFriends, param: 'newFriends'}));
                }

                notification.newFriends = options.newFriends;
            }

            if (options.hasOwnProperty('newMessages')){

                if (typeof !!options.newMessages !== 'boolean') {
                    return next(badRequests.InvalidValue({value: options.newMessages, param: 'newMessages'}));
                }

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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `users/find/:page?`__
         *
         * This __method__ allows find nearest `FRNDR` user's to current _User_
         *
         * @example Request example:
         *         146.148.120.34:8859/users/find/2
         *
         * @example Response example:
         *
         * [
         *   {
         *      "userId": "560919c349d6a608179610c5",
         *      "avatar": "146.148.120.34:8859/uploads/development/images/560919cb49d6a608179610c7.png",
         *      "name": "Petrovich",
         *      "age": 25,
         *      "distance": 0,
         *      "sexual": "Straight",
         *      "jobTitle": "Doctor",
         *      "smoker": false,
         *      "likes": [
         *          "tenis",
         *          "box",
         *          "cars"
         *      ],
         *      "bio": "Some biography",
         *      "gallery": [
         *          "146.148.120.34:8859/uploads/development/images/560919cd49d6a608179610c8.png"
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

        userHelper.getAllUsersBySearchSettings(uId, page, function (err, users) {

            if (err) {
                return next(err);
            }

            res.status(200).send(users);

        });

    };

    this.getFriendList = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users/friendList/:page?`__
         *
         * This __method__ allows to get _User's_ friends list
         *
         * @example Request example:
         *         146.148.120.34:8859/users/friendList
         *
         * @example Response example:
         *
         * [
         *  {
         *      "name": "Vasya",
         *      "avatar": "",
         *      "friendId": "5614d7f92513325c1c5fbd86",
         *      "newFriend": false,
         *      "message": "some message",
         *      "date": "2015-10-07T08:33:36.187Z",
         *      "haveNewMsg": true
         *  },
         *  {
         *      "name": "",
         *      "avatar": "146.148.120.34:8859/uploads/development/images/56128ef4a4dce4a001e17a49.png",
         *      "friendId": "560e908d70578cec1c8641fc",
         *      "newFriend": true,
         *      "message": "New friend. Say Hello.",
         *      "date": "",
         *      "haveNewMsg": false
         *  }
         * ]
         *
         * @method getFriendList
         * @instance
         */

        var userId = req.session.uId;
        var pageCount = req.params.page || 1;
        var resultArray = [];
        var skipCount;

        if (isNaN(pageCount) || pageCount < 1) {
            return next(badRequests.InvalidValue({value: pageCount, param: 'page'}));
        }

        skipCount = (pageCount-1) * CONSTANTS.LIMIT.FRIENDS;

        Contact
            .find({userId: userId})
            .sort({becomesFriendDate: -1})
            .skip(skipCount)
            .limit(CONSTANTS.LIMIT.FRIENDS)
            .exec(function(err, friendsModels){

                if (err){
                    return next(err);
                }

                async.eachSeries(friendsModels,

                    function (friendModel, cb) {
                        var friendId = friendModel.friendId;
                        var isNewFriend = friendModel.isNewFriend;
                        var becomesFriendDate = friendModel.becomesFriendDate;

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
                                var date = '';
                                var owner;

                                if (err) {
                                    return cb(err);
                                }

                                if (!messageModelsArray.length) {
                                    if (isNewFriend){
                                        msg = 'New friend. Say Hello.';
                                        newFriend = true;
                                        date = becomesFriendDate;
                                    } else {
                                        msg = 'You have no active chats with this friend';
                                    }
                                } else {
                                    msg = messageModelsArray[0].get('text');
                                    owner = messageModelsArray[0].get('owner');
                                    date = messageModelsArray[0].get('date');
                                }

                                User
                                    .findOne({_id: ObjectId(friendId)})
                                    .populate({path: 'images', select: '-_id avatar'})
                                    .exec(function (err, userModel) {
                                        var avatarName;
                                        var avatarUrl = '';
                                        var resultObj = {};
                                        var imageModel;
                                        var haveNewMsg = false;

                                        if (err) {
                                            return cb(err);
                                        }

                                        if (!userModel || !userModel.images){
                                            return cb(badRequests.DatabaseError())
                                        }

                                        if (userModel.profile && userModel.profile.name){
                                            resultObj.name = userModel.profile.name
                                        } else {
                                            resultObj.name = '';
                                        }

                                        imageModel = userModel.images;

                                        if (imageModel) {
                                            avatarName = imageModel.get('avatar');

                                            if (avatarName){
                                                avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                                            }
                                        }

                                        if (date > friendModel.lastReadDate && friendId === owner){
                                            haveNewMsg = true;
                                        }

                                        resultObj.friendId = friendId;
                                        resultObj.newFriend = newFriend;
                                        resultObj.avatar = avatarUrl;
                                        resultObj.message = msg;
                                        resultObj.date = date;
                                        resultObj.haveNewMsg = haveNewMsg;

                                        resultArray.push(resultObj);
                                        cb();
                                    });

                            })
                    },

                    function (err) {
                        if (err) {
                            return next(err);
                        }

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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users/blockFriend/:id`__
         *
         * This __method__ allows block _User's_ friend
         *
         * @example Request example:
         *         146.148.120.34:8859/users/blockFriend/55f938010bc036b01945f1e7
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

                io.to(blockedId).emit('friend deleted', {friendId: userId});

                res.status(200).send({success: 'User blocked successfully'});
            })
    };

    this.getFriendProfile = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/users/friendProfile/:id`__
         *
         * This __method__ allows get _friends profile_
         *
         * @example Request example:
         *         146.148.120.34:8859/users/friendProfile/5603acdcbc68399017c2c3e3
         *
         * @example Response example:
         *
         *  {
         *      "_id": "5603acdcbc68399017c2c3e3",
         *      "images": {
         *          "avatar": {
         *              "fileName": "56091c0c49d6a608179610df",
         *              "url": "146.148.120.34:8859/uploads/development/images/56091c0c49d6a608179610df.png"
         *          },
         *          "gallery": [
         *              {
         *                  "fileName": "56091c1049d6a608179610e0",
         *                  "url": "146.148.120.34:8859/uploads/development/images/56091c1049d6a608179610e0.png"
         *              },
         *              {
         *                  "fileName": "56091c1149d6a608179610e1",
         *                  "url": "146.148.120.34:8859/uploads/development/images/56091c1149d6a608179610e1.png"
         *              },
         *              {
         *                  "fileName": "56091c1149d6a608179610e2",
         *                  "url": "146.148.120.34:8859/uploads/development/images/56091c1149d6a608179610e2.png"
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
         *      "sexual": "Straight",
         *      "relStatus": "Single",
         *      "sex": "Male"
         *      }
         *  }
         *
         * @method getFriendProfile
         * @instance
         */

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
                var photoNames;
                var galleryArray = [];
                var images;

                if (err) {
                    return next(err);
                }

                if (!friendModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                friendModelJSON = friendModel.toJSON();

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
                        var photoUrl = imageHandler.computeUrl(photoName, CONSTANTS.BUCKETS.IMAGES);

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

};

module.exports = UserHandler;
