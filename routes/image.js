/**
 * Created by migal on 15.09.15.
 */
var express = require('express');
var router = express.Router();

var ImageHandler = require('../handlers/image');

module.exports = function(app, db){

    var image = new ImageHandler(db);

    router.post('/avatar', image.uploadAvatar);
    router.get('/avatar', image.getAvatarUrl);

    return router;
};
