var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var MessageHandler = require('../handlers/messages');

module.exports = function(app, db){
    var sessionHandler = new SessionHandler();
    var messageHandler = new MessageHandler(app, db);

    router.delete('/:id', sessionHandler.authenticatedUser, messageHandler.clearMessage);
    router.get('/:id/:pageCount', sessionHandler.authenticatedUser, messageHandler.getChatHistory);
    router.post('/', sessionHandler.authenticatedUser, messageHandler.sendMessage);
    router.delete('/', sessionHandler.authenticatedUser, messageHandler.clearHistoty);

    return router;
};
