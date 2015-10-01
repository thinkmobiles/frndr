/**
 * @description Message management module
 * @module messageHandler
 *
 */

var CONSTANTS = require('../constants/index');

var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');
//var apn = require('../helpers/apns')(path.join('config/PseudoAPNSDev_2.p12'));


var MessageHandler = function (app, db) {
    var io = app.get('io');
    var Message = db.model('Message');
    var PushTokens = db.model('PushTokens');
    var ObjectId = mongoose.Types.ObjectId;
    var self = this;

    this.computeChatId = function(userId, friendId) {
        if (userId < friendId) {
            return userId + ':' + friendId;
        } else {
            return friendId + ':' + userId;
        }
    };

    this.sendPushNotification = function(friendId, message, pushOptions, callback){

        PushTokens.findOne({user:ObjectId(friendId)}, function(err, pushModel){
            var pushToken;
            var success = false;

            if (err){
                return callback(err);
            }

            if (!pushModel){
                return callback(badRequests.DatabaseError());
            }

            pushToken = pushModel.get('token');

            if (!pushToken || !pushToken.length){
                console.warn('Push token for user, with id: ' + friendId + ' is empty, please check it.');
            } else {
                success = apn.sendPush(pushToken, message, pushOptions);
            }

            callback(null, success);
        });
    };

    this.deleteMessages = function(userId, callback){

        Message
            .find({show: {$in: [userId]}}, function (err, messageModels) {
                if (err) {
                    return callback(err);
                }

                if (!messageModels) {
                    return callback(badRequests.NotFound({target: 'Messages'}));
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

                        callback();
                    });
            });
    };

    this.sendMessage = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/messages`__
         *
         * This __method__ allows send  _Message_
         *
         * @example Request example:
         *         http://134.249.164.53:8859/messages
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
        var messageModel;
        var chatId;
        var msg;
        var friendId;

        if (!options || !options.message || !options.friendId || !options.message.length) {
            return next(badRequests.NotEnParams({reqParams: 'message and friendId'}));
        }

        msg = options.message.toString();
        friendId = options.friendId;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(friendId)){
            return next(badRequests.InvalidValue({value: friendId, param: 'friendId'}));
        }

        chatId = self.computeChatId(userId, friendId);

        messageModel = new Message({
            chatId: chatId,
            owner: userId,
            text: msg,
            show: [userId, friendId]
        });

        messageModel
            .save(function (err) {
                /*var pushOptions = {
                    expirationDate: Date.now()/1000
                    //payload:{}, //доп інфа для аплікейшена наприклад
                    //badge:'', //картинка
                    //sound:'' //звук
                };*/

                if (err) {
                    return next(err);
                }

                io.to(userId).emit('chat message', msg);
                io.to(friendId).emit('chat message', msg);

                //TODO send push notification to friendId

                /*self.sendPushNotification(friendId, msg, pushOptions, function(err, success){
                    if (err){
                        //return next(err);
                        console.warn(err);
                    }

                    if (!success){
                        console.warn('Push notification not sended');
                    }

                    res.status(200).send({success: 'Message send successfully'});
                });*/

                res.status(200).send({success: 'Message send successfully'});
            });
    };

    this.clearMessage = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/messages/:id`__
         *
         * This __method__ allows delete _Message_ with id
         *
         *
         * @example Request example:
         *         http://134.249.164.53:8859/messages/55fbcffaf60866ec1fe95ff6
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
         * __HOST: `http://134.249.164.53:8859`__
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
         *         http://134.249.164.53:8859/messages/
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
                        res.status(200).send({success: 'History cleared successfully'});
                    });
            });
    };

    this.getChatHistory = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/messages/:id/:page?`__
         *
         * This __method__ allows to get chat __Messages__
         *
         * @example Request example:
         *         http://134.249.164.53:8859/55fbcb7cc06791dc1dad4645/0
         *
         *
         * @example Response example:
         *    [
         *      {
         *          "_id": "5600127b670ed1ac1b3d60b0",
         *          "owner": "55fbcb7cc06791dc1dad46567",
         *          "text": "testing12gffd34ffffff5",
         *          "date": "2015-09-21T14:21:47.134Z"
         *      },
         *      {
         *          "_id": "56001273670ed1ac1b3d60af",
         *          "owner": "55fbcb7cc06791dc1dad46567",
         *          "text": "testing1234ffffff5",
         *          "date": "2015-09-21T14:21:39.383Z"
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
                    return next(err);
                }
                messagesModels.reverse(); //newest messages at the end of array

                res.status(200).send(messagesModels);
            });

    };

    this.clearAllMessages = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/messages/all`__
         *
         * This __method__ allows delete all _Chats_ history
         *
         * @example Request example:
         *         http://134.249.164.53:8859/messages/all/
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
