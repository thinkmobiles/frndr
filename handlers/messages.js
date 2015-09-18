var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var MessageHandler = function (app, db) {
    var io = app.get('io');
    var Message = db.model('Message');

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

        if (userId < friendId) {
            chatId = userId + ':' + friendId;
        } else {
            chatId = friendId + ':' + userId;
        }

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

    this.clearMessage = function(req, res, next){
        var userId = req.session.uId;
        var messageId = req.params.id;

        Message.findOne({_id:messageId}, function(err, messageModel){
            if (err){
                return next(err);
            }

            if (!messageModel){
                return next(badRequests.NotFound({message: 'Message not found'}));
            }

            messageModel.update({$pull:{show: userId.toString()}}, function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Message deleted successfully'});
            });
        });

    };

};

module.exports = MessageHandler;
