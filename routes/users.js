var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);

    router.get('/', userHandler.getCurrentUser);
    router.get('/:id', userHandler.getUserById);
    router.delete('/:id', userHandler.deleteUserById);

    return router;
};
