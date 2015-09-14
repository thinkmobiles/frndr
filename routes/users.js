var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');
var LikeHandler = require('../handlers/likes');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);
    var like = new LikeHandler(db);

    router.get('/geo/:d', userHandler.findNearestUsers);
    router.get('/like/:id', like.likeUserById);
    router.get('/dislike/:id', like.dislikesUserById);
    router.get('/:id?', userHandler.getUserById);
    router.put('/', userHandler.updateProfile);
    router.delete('/:id', userHandler.deleteUserById);

    return router;
};
