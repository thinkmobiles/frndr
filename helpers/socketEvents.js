'use strict';

var socketEvents = function (io) {


    io.on('connection', function( socket ) {
        console.log('>>> user connected to socket');

        socket.on('chat message', function(msg){
            console.log(msg);
            io.emit('chat message', msg);
        });

        //socket.emit('welcome');

        /*socket.on('authorize', function (data) {
            console.log('>>> socket.io authorize');
            console.log(data);
        });

        socket.on('logout', function (data) {
            console.log('>>> socket.io logout');
            console.log(data);
        });*/
    });


};

module.exports = socketEvents;

