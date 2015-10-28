var socketEvents = function (app) {

    'use strict';

    var io = app.get('io');
    var db = app.get('db');

    var Contact = db.model('Contact');

    io.on('connection', function( socket ) {

        socket.emit('connectedToServer', {success: true});

        socket.on('authorize', function (userId){
            socket.join(userId);
        });

        socket.on('read', function(data){
            var userId = data.userId;
            var friendId = data.friendId;

            Contact
                .findOneAndUpdate({userId: userId, friendId: friendId}, {$set: {lastReadDate: Date.now()}}, function(err){
                    if (err){
                        return console.log(err);
                    }

                });

        });

        socket.on('last message', function(data){
            var userId = data.userId;

            Contact
                .update({userId: userId}, {$set: {isNewFriend: false}}, function(err){
                    if (err){
                        return console.log(err);
                    }

                });
        });

    });
};

module.exports = socketEvents;

