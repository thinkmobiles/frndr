/**
 * @description Like/Dislike module
 * @module likeHandler
 *
 */

var CONSTANTS = require('../constants/index');
var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');
var PushHandler = require('./pushes');
var ImageHandler = require('./image');

var LikesHandler = function (app, db) {

    'use strict';

    var push = PushHandler(db);
    var imageHandler = new ImageHandler(db);
    var Like = db.model('Like');
    var User = db.model('User');
    var Contact = db.model('Contact');
    var ObjectId = mongoose.Types.ObjectId;
    var io = app.get('io');


    function addToFriend(userId, friendId, callback) {
        var message;
        var contactModel;
        var friendName;
        var resultObj = {};

        async
            .series([
                function (cb) {
                    contactModel = new Contact(
                        {
                            userId: userId,
                            friendId: friendId
                        });

                    contactModel
                        .save(function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null);
                        });
                },

                function(cb){
                    User.findOne({_id: friendId})
                        .populate({path:'images', select: '-_id avatar'})
                        .exec(function(err, friendModel){
                            var imageModel;
                            var avatarName;
                            var avatarUrl = '';

                            if (err){
                                return cb(err);
                            }

                            if (!friendModel){
                                return cb(badRequests.DatabaseError());
                            }

                            friendName = friendModel.profile.name || '';
                            message = 'You have a new friend ' + friendName;

                            imageModel = userModel.images;

                            if (imageModel) {
                                avatarName = imageModel.get('avatar');

                                if (avatarName){
                                    avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                                }
                            }

                            resultObj.name = friendName;
                            resultObj.friendId = friendId;
                            resultObj.avatar = avatarUrl;
                            resultObj.newFriend = true;
                            resultObj.message = 'New friend. Say Hello.';
                            resultObj.date = contactModel.becomesFriendDate;
                            resultObj.haveNewMsg = false;

                            io.to(userId).emit('new friend', resultObj);

                            console.log('>>> new friend event');

                            cb();
                    });
                },

                function (cb) {
                    var pushOptions = {};

                    pushOptions.category = CONSTANTS.CATEGORIES.FRIEND;

                    push.sendPushNotification(userId, message, pushOptions, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null);
                    });
                }

            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                callback(null);
            });
    }

    this.likeUserById = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/like/:id`__
         *
         * This __method__ allows _User_ like some people
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/like/55f6ad4bb70b86d02a0d1751
         *
         * @method likeUserById
         * @instance
         */

        var userId = req.session.uId;
        var likedUserId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(likedUserId)) {
            return next(badRequests.InvalidValue({value: likedUserId, param: 'id'}));
        }

        async.waterfall([

                //create or update Like model of user with userId
                function (cb) {
                    Like
                        .findOne({user: ObjectId(userId)}, function (err, likeModel) {
                            var likesArray = [];

                            if (err) {
                                return cb(err);
                            }

                            if (!likeModel) {
                                likesArray.push(likedUserId);
                                likeModel = new Like({
                                    user: ObjectId(userId),
                                    likes: likesArray,
                                    dislikes: []
                                });

                                return cb(null, likeModel);
                            }

                            if (likeModel.likes.indexOf(likedUserId) !== -1) {
                                return cb(null, null);
                            }

                            likeModel.likes.push(likedUserId);

                            cb(null, likeModel);
                        })
                },

                //save likeModel of previous user
                function (likeModel, cb) {
                    if (!likeModel) {
                        return cb();
                    }

                    likeModel
                        .save(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            cb();
                        })
                },

                //try to find Like model of user with likedUserId and decide add to friends or not
                function (cb) {
                    Like
                        .findOne({user: ObjectId(likedUserId)}, function (err, likeModel) {
                            if (err) {
                                return cb(err);
                            }

                            if (!likeModel) {
                                return cb(null, null);
                            }

                            if (likeModel.likes.indexOf(userId) === -1) {
                                return cb(null, null);
                            }

                            //need add to friends
                            cb(null, true);

                        })
                },

                //add to friends
                function (canBeFriends, cb) {
                    if (!canBeFriends) {
                        return cb(null);
                    }

                    async
                        .parallel([
                            async.apply(addToFriend, userId, likedUserId),
                            async.apply(addToFriend, likedUserId, userId)
                        ], function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null);
                        });

                }
            ],
            function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'User likes successfully'});

            });
    };

    this.dislikesUserById = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/dislike/:id`__
         *
         * This __method__ allows _User_ dislike some people
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/dislike/55f6ad4bb70b86d02a0d1751
         *
         * @method dislikesUserById
         * @instance
         */

        var uId = req.session.uId;
        var dislikeId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(dislikeId)) {
            return next(badRequests.InvalidValue({value: dislikeId, param: 'id'}));
        }

        Like
            .findOne({user: ObjectId(uId)})
            .exec(function (err, resultModel) {
                var likeModel;

                if (err) {
                    return next(err);
                }

                if (!resultModel) {

                    likeModel = new Like({user: ObjectId(uId), likes: [], dislikes: [dislikeId]});

                    likeModel
                        .save(function (err) {

                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'User dislikes successfully'});

                        });

                } else {

                    resultModel.update({$addToSet: {dislikes: dislikeId}}, function (err) {

                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: 'User dislikes successfully'});

                    });

                }


            });
    }
};

module.exports = LikesHandler;
