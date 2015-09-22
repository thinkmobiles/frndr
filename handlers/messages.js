/**
 * @description Message management module
 * @module messageHandler
 *
 */

var CONSTANTS = require('../constants/index');

var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var MessageHandler = function (app, db) {
    var io = app.get('io');
    var Message = db.model('Message');

    function computeChatId(userId, friendId) {
        if (userId < friendId) {
            return userId + ':' + friendId;
        } else {
            return friendId + ':' + userId;
        }
    }

    this.sendMessage = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/messages`__
         *
         * This __method__ allows send  _Message_
         *
         * @example Request example:
         *         http://192.168.88.250:8859/messages
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
            return next(badRequests.NotEnParams({message: 'message and friendId is required'}));
        }

        msg = options.message;
        friendId = options.friendId;
        chatId = computeChatId(userId, friendId);

        messageModel = new Message({
            chatId: chatId,
            text: msg,
            show: [userId, friendId]
        });

        messageModel
            .save(function (err) {
                if (err) {
                    return next(err);
                }

                io.to(userId).emit('chat message', msg);
                io.to(friendId).emit('chat message', msg);

                res.status(200).send({success: 'Message send successfully'});
            });
    };

    this.clearMessage = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/messages/:id`__
         *
         * This __method__ allows delete _Message_ with id
         *
         *
         * @example Request example:
         *         http://192.168.88.250:8859/messages/55fbcffaf60866ec1fe95ff6
         *
         *
         * @method clearMessage
         * @instance
         */

        var userId = req.session.uId;
        var messageId = req.params.id;

        Message.findOne({_id: messageId}, function (err, messageModel) {
            var showArray;

            if (err) {
                return next(err);
            }

            if (!messageModel) {
                return next(badRequests.NotFound({message: 'Message not found'}));
            }

            showArray = messageModel.get('show');

            if ((showArray.length === 1) && (showArray.indexOf(userId.toString()) !== -1)) {

                messageModel.remove(function (err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).send({success: 'Message deleted successfull'});
                });

            } else {

                messageModel.update({$pull: {show: userId.toString()}}, function (err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).send({success: 'Message deleted successfull'});
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
         * __HOST: `http://192.168.88.250:8859`__
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
         *         http://192.168.88.250:8859/messages/
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
            return next(badRequests.NotEnParams({message: 'friendId is required'}));
        }

        friendId = options.friendId;
        chatId = computeChatId(userId, friendId);

        Message
            .find({chatId: chatId}, function (err, models) {
                if (err) {
                    return next(err);
                }

                async.each(models,

                    function (messageModel, cb) {
                        messageModel.update({$pull: {show: userId.toString()}}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    function (err, result) {
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
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/messages/:id/:page`__
         *
         * This __method__ allows to get chat __`Messages`__
         *
         * @example Request example:
         *         http://192.168.88.250:8859/55fbcb7cc06791dc1dad4645/0
         *
         *
         * @example Response example:
         *    [
         *      {
         *          "_id": "5600127b670ed1ac1b3d60b0",
         *          "text": "testing12gffd34ffffff5",
         *          "date": "2015-09-21T14:21:47.134Z"
         *      },
         *      {
         *          "_id": "56001273670ed1ac1b3d60af",
         *          "text": "testing1234ffffff5",
         *          "date": "2015-09-21T14:21:39.383Z"
         *      }
         *    ]
         * @method getChatHistory
         * @instance
         */

        var userId = req.session.uId;
        var pageCount = (req.params.pageCount - 1) * CONSTANTS.MESSAGES.LIMIT;
        var friendId = req.params.id;
        var chatId;

        if (isNaN(pageCount) || (pageCount < 0)) {
            return next(badRequests.InvalidValue({message: 'Invalid value page count'}));
        }

        chatId = computeChatId(userId, friendId);

        Message
            .find({chatId: chatId, show: {$in: [userId]}}, {__v: 0, chatId: 0, show: 0}, {
                sort: {
                    date: -1
                },
                skip: pageCount,
                limit: CONSTANTS.MESSAGES.LIMIT
            },

            function (err, models) {
                if (err) {
                    return next(err);
                }

                res.status(200).send(models);
            });

    };

    this.clearAllMessages = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/messages/all/`__
         *
         * This __method__ allows delete _Chat_ history
         *
         * @example Request example:
         *         http://192.168.88.250:8859/messages/all/
         *
         * @method clearHistory
         * @instance
         */

        var userId = req.session.uId;

        Message
            .find({show: {$in: [userId.toString()]}}, function (err, messageModels) {
                if (err) {
                    return next(err);
                }

                if (!messageModels) {
                    return next(badRequests.NotFound({message: 'Messages not found'}));
                }

                async.each(messageModels,

                    function (messageModel, cb) {
                        var showArray = messageModel.get('show');

                        if ((showArray.length === 1) && (showArray.indexOf(userId.toString()) !== -1)) {

                            messageModel.remove(function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                return cb();
                            });

                        } else {

                            messageModel.update({$pull: {show: userId.toString()}}, function (err) {
                                if (err) {
                                    return cb(err);
                                }

                                return cb();
                            });

                        }
                    },

                    function (err) {
                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: 'All history cleared successfully'});
                    });
            });
    };

};

module.exports = MessageHandler;
