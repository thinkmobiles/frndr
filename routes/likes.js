var express = require('express');
var router = express.Router();
var LikesHandler = require('../handlers/likes');

module.exports = function (app, db) {
    var likesHandler = new LikesHandler(db);

    router.get('/:id', likesHandler.likeUserById);

    return router;
};
