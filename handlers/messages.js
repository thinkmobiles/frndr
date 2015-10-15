/**
 * @description Message management module
 * @module messageHandler
 *
 */

var CONSTANTS = require('../constants/index');

var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');
var PushHandler = require('./pushes');
var ImageHandler = require('./image');

var MessageHandler = function (app, db) {

    'use strict';

    var pusher = PushHandler(db);
    var imageHandler = new ImageHandler(db);
    var io = app.get('io');
    var Message = db.model('Message');
    var User = db.model('User');
    var Contact = db.model('Contact');
    var ObjectId = mongoose.Types.ObjectId;
    var self = this;

    this.computeChatId = function(userId, friendId) {
        if (userId < friendId) {
            return userId + ':' + friendId;
        } else {
            return friendId + ':' + userId;
        }
    };

    this.deleteMessages = function(userId, callback){

        Message
            .find({show: {$in: [userId]}}, function (err, messageModels) {
                if (err) {
                    return callback(err);
                }

                async.each(messageModels,

                    function (messageModel, cb) {
                        var showArray = messageModel.get('show');

                        if ((showArray.length === 1) && (showArray.indexOf(userId) !== -1)) {

                            messageModel.remove(function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                return cb();
                            });

                        } else {

                            messageModel.update({$pull: {show: userId}}, function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                return cb();
                            });

                        }
                    },

                    function (err) {
                        if (err) {
                            return callback(err);
                        }

                        Contact
                            .update({userId: userId}, {$set: {isNewFriend: false}}, function(err){

                                if (err){
                                    return callback(err);
                                }

                                callback(null);

                            });

                    });
            });
    };

    this.sendMessage = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/messages`__
         *
         * This __method__ allows send  _Message_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/messages
         *
         * @example Body example:
         *
         * {
         *      "friendId":"55fbcb7cc06791dc1dad4645",
         *      "message":"testing1234ffffff5"
         *  }
         *
         * @param {string} friendId - friend's id
         * @param {string} message - message text
         * @method sendMessage
         * @instance
         */

        var userId = req.session.uId;
        var options = req.body;
        var msg;
        var friendId;
        var messageModel;

        if (!options || !options.message || !options.friendId || !options.message.length) {
            return next(badRequests.NotEnParams({reqParams: 'message and friendId'}));
        }

        msg = options.message.toString();
        friendId = options.friendId;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(friendId)){
            return next(badRequests.InvalidValue({value: friendId, param: 'friendId'}));
        }

        async.series([

                //check on blocked user
                function(cb){
                    var blockList;

                    User
                        .findOne({_id: ObjectId(friendId)}, {blockList: 1}, function(err, resultUser){
                            if (err){
                                return cb(err);
                            }

                            if(!resultUser){
                                return cb(badRequests.DatabaseError());
                            }

                            blockList = resultUser.get('blockList');

                            if (blockList.indexOf(userId) !== -1){
                                err = new Error('This user blocked You');
                                err.status = 400;

                                return cb(err);
                            }

                            cb();
                        });
                },

                //save message model to DB
                function(cb){
                    var chatId = self.computeChatId(userId, friendId);

                    messageModel = new Message({
                        chatId: chatId,
                        owner: userId,
                        text: msg,
                        show: [userId, friendId]
                    });

                    messageModel
                        .save(function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                },

                //get user info for push notification // send socket events and push notification
                function(cb){
                    User
                        .findOne({_id: ObjectId(userId)})
                        .populate({path: 'images', select:'-_id avatar'})
                        .exec(function(err, userModel){
                            var pushOptions = {};
                            var userName;
                            var avatarName;
                            var avatarUrl = '';
                            var pushMessage;

                            if (!userModel || !userModel.images){
                                return cb(badRequests.DatabaseError());
                            }

                            userName = userModel.profile.name || '';
                            avatarName = userModel.images.avatar || '';

                            if (avatarName){
                                avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                            }

                            pushOptions.payload = {
                                avatarUrl: avatarUrl,
                                friendName: userName,
                                friendId: userId
                            };

                            pushOptions.category = CONSTANTS.CATEGORIES.MESSAGE;
                            pushMessage = userName + ':\n' + msg;

                            io.to(userId).emit('chat message', {ownerId: userId, friendId: friendId, message: msg, messageId: messageModel._id});
                            io.to(friendId).emit('chat message', {ownerId: userId, friendId: userId, message: msg, messageId: messageModel._id});

                            pusher.sendPushNotification(friendId, pushMessage, pushOptions, function(err){
                                if (err){
                                    return cb(err);
                                }

                                cb();
                            });
                        });
                }
            ],

            function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Message send successfully'});
            });
    };

    this.clearMessage = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/messages/:id`__
         *
         * This __method__ allows delete _Message_ with id
         *
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/messages/55fbcffaf60866ec1fe95ff6
         *
         *
         * @method clearMessage
         * @instance
         */

        var userId = req.session.uId;
        var messageId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(messageId)){
            return next(badRequests.InvalidValue({value: messageId, param: 'id'}));
        }

        Message.findOne({_id: ObjectId(messageId)}, function (err, messageModel) {
            var showArray;

            if (err) {
                return next(err);
            }

            if (!messageModel) {
                return next(badRequests.NotFound({target: 'Message'}));
            }

            showArray = messageModel.get('show');

            if ((showArray.length === 1) && (showArray.indexOf(userId) !== -1)) {

                messageModel.remove(function (err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).send({success: 'Message deleted successfully'});
                });

            } else {

                messageModel.update({$pull: {show: userId}}, function (err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).send({success: 'Message deleted successfully'});
                });

            }
        });

    };

    this.clearHistory = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/messages/`__
         *
         * This __method__ allows delete _Chat_ history
         *
         *  @example Body example:
         *
         * {
         *      "friendId":"55fbcb7cc06791dc1dad4645"
         *  }
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/messages/
         *
         * @param {string} friendId - friend's id from delete chat history
         *
         * @method clearHistory
         * @instance
         */

        var userId = req.session.uId;
        var options = req.body;
        var chatId;
        var friendId;

        if (!options || !options.friendId) {
            return next(badRequests.NotEnParams({reqParams: 'friendId'}));
        }

        friendId = options.friendId;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(friendId)){
            return next(badRequests.InvalidValue({value: friendId, param: 'friendId'}));
        }

        chatId = self.computeChatId(userId, friendId);

        Message
            .find({chatId: chatId}, function (err, models) {
                if (err) {
                    return next(err);
                }

                async.each(models,

                    function (messageModel, cb) {
                        var showArray = messageModel.get('show');

                        if ((showArray.length === 1) && (showArray.indexOf(userId) !== -1)) {

                            messageModel.remove(function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                cb();
                            });

                        } else {

                            messageModel.update({$pull: {show: userId}}, function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                cb();
                            });

                        }
                    },

                    function (err) {
                        if (err) {
                            return next(err);
                        }

                        Contact
                            .update({userId: userId, friendId: friendId}, {$set: {isNewFriend: false}}, function(err){

                                if (err){
                                    return next(err);
                                }

                                res.status(200).send({success: 'History cleared successfully'});
                            });


                    });
            });
    };

    this.getChatHistory = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/messages/:id/:page?`__
         *
         * This __method__ allows to get chat __Messages__
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/messages/55fbcb7cc06791dc1dad4645/1
         *
         *
         * @example Response example:
         *    [
         *      {
         *          "_id": "56001273670ed1ac1b3d60af",
         *          "owner": "55fbcb7cc06791dc1dad46567",
         *          "text": "testing1234ffffff5",
         *          "date": "2015-09-21T14:21:39.383Z"
         *      },
         *      {
         *          "_id": "5600127b670ed1ac1b3d60b0",
         *          "owner": "55fbcb7cc06791dc1dad46567",
         *          "text": "testing12gffd34ffffff5",
         *          "date": "2015-09-21T14:21:47.134Z"
         *      }
         *    ]
         * @method getChatHistory
         * @instance
         */

        var userId = req.session.uId;
        var pageCount = req.params.pageCount || 1;
        var friendId = req.params.id;
        var chatId;

        if (isNaN(pageCount) || (pageCount < 1)) {
            return next(badRequests.InvalidValue({value: pageCount, param: 'page'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(friendId)){
            return next(badRequests.InvalidValue({value: friendId, param: 'id'}));
        }

        pageCount = (pageCount -1) * CONSTANTS.LIMIT.MESSAGES;
        chatId = self.computeChatId(userId, friendId);

        async
            .parallel([
                function(cb){
                    Message
                        .find({chatId: chatId, show: {$in: [userId]}}, {__v: 0, chatId: 0, show: 0}, {
                            sort: {
                                date: -1
                            },
                            skip: pageCount,
                            limit: CONSTANTS.LIMIT.MESSAGES
                        },

                        function (err, messagesModels) {
                            if (err) {
                                return cb(err);
                            }
                            messagesModels.reverse(); //newest messages at the end of array

                            cb(null, messagesModels);
                        });
                },
                function(cb){
                    Contact
                        .update({userId: userId, friendId: friendId}, {$set: {lastReadDate: Date.now()}}, function(err){

                            if (err){
                                return cb(err);
                            }

                            cb(null);
                        });
                }
            ], function(err, result){

                if (err){
                    return next(err);
                }

                res.status(200).send(result[0]);

            });
    };

    this.clearAllMessages = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/messages/all`__
         *
         * This __method__ allows delete all _Chats_ history
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/messages/all/
         *
         * @method clearAllMessages
         * @instance
         */

        var userId = req.session.uId;

        self.deleteMessages(userId, function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'All history cleared successfully'});
        });
    };

};

module.exports = MessageHandler;
