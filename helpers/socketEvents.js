'use strict';

var socketEvents = function (app) {

    'use strict';

    var io = app.get('io');
    var db = app.get('db');

    var Contact = db.model('Contact');

    io.on('connection', function( socket ) {

        socket.emit('connectedToServer', {success: true});

        socket.on('authorize', function (userId){
            console.log('>>> User with userId: ' + userId + ' connected to socket ' + socket.id);
            socket.join(userId);
        });

        socket.on('read', function(data){
            console.log('User read message');

            var userId = data.userId;
            var friendId = data.friendId;

            Contact
                .findOneAndUpdate({userId: userId, friendId: friendId}, {$set: {lastReadDate: Date.now()}}, function(){});

        });

        socket.on('disconnect', function(){
            console.log('>>> socket ' + socket.id + ' disconnected');
        });
    });
};

module.exports = socketEvents;

