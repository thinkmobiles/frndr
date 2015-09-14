var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);

    router.get('/geo/:d', userHandler.findNearestUsers);
    router.get('/:id?', userHandler.getUserById);
    router.put('/', userHandler.updateProfile);
    router.delete('/:id', userHandler.deleteUserById);


    return router;
};
