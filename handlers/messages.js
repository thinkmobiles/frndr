var CONSTANTS = require('../constants/index');

var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var MessageHandler = function (app, db) {
    var io = app.get('io');
    var Message = db.model('Message');

    function computeChatId (userId, friendId){
        if (userId < friendId) {
            return userId + ':' + friendId;
        } else {
            return friendId + ':' + userId;
        }
    }

    this.sendMessage = function (req, res, next) {
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

    this.clearHistoty = function (req, res, next) {
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
        var userId = req.session.uId;
        var pageCount = req.params.pageCount * CONSTANTS.MESSAGES.LIMIT;
        var friendId = req.params.id;
        var chatId;

        if (isNaN(pageCount)) {
            return next(badRequests.InvalidValue({message: 'Invalid value page count'}));
        }

        chatId = computeChatId(userId, friendId);

        Message
            .find({chatId: chatId, show: {$in: [userId]}}, {__v: 0, chatId: 0}, {
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

};

module.exports = MessageHandler;
