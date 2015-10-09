'use strict';

var socketEvents = function (io) {

    'use strict';

    io.on('connection', function( socket ) {

        socket.emit('connectedToServer', {success: true});

        socket.on('authorize', function (userId){
            console.log('>>> User with userId: ' + userId + ' connected to socket ' + socket.id);
            socket.join(userId);
        });

        socket.on('disconnect', function(){
            console.log('>>> socket ' + socket.id + ' disconnected');
        });
    });
};

module.exports = socketEvents;

