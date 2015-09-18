var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var MessageHandler = require('../handlers/messages');

module.exports = function(app, db){
    var sessionHandler = new SessionHandler();
    var messageHandler = new MessageHandler(app, db);

    router.post('/sendMessage', sessionHandler.authenticatedUser, messageHandler.sendMessage);
    router.delete('/:id', sessionHandler.authenticatedUser, messageHandler.clearMessage);


    return router;
};
