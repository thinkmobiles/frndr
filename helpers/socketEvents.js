'use strict';

var socketEvents = function (io) {


    io.on('connect', function( socket ) {

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

