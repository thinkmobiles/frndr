'use strict';

var socketEvents = function (io) {


    io.on('connection', function( socket ) {
        console.log('socket connected');
        socket.emit('connectedToServer', {success: 'Success'});

        socket.on('authorize', function (userId){
            console.log('>>> User with userId: ' + userId + ' connected to socket');
            //socket.join(userId);
        });

        socket.on('logout', function(){
            socket.disconnect();
        });

    });


};

module.exports = socketEvents;

