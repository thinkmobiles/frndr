'use strict';

var socketEvents = function (io) {

    'use strict';

    io.on('connection', function( socket ) {

        socket.emit('connectedToServer', {success: true});

        socket.on('authorize', function (userId){
            console.log('>>> User with userId: ' + userId + ' connected to socket');
            socket.join(userId);
        });

        socket.on('logout', function(){
            socket.disconnect();
        });

    });
};

module.exports = socketEvents;

