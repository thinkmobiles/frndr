/**
 * Created by migal on 15.09.15.
 */
var express = require('express');
var router = express.Router();

var ImageHandler = require('../handlers/image');
var SessionHandler = require('../handlers/session');

module.exports = function(app, db){
    var sessionHandler = new SessionHandler();
    var image = new ImageHandler(db);

    router.post('/avatar', sessionHandler.authenticatedUser, image.uploadAvatar);
    router.delete('/avatar', sessionHandler.authenticatedUser, image.removeAvatar);
    router.get('/avatar/:id?', sessionHandler.authenticatedUser, image.getAvatarUrl);
    router.post('/photo', sessionHandler.authenticatedUser, image.uploadPhotoToGallery);
    router.delete('/photo', sessionHandler.authenticatedUser, image.removeImageFromGallery);
    router.get('/photo', sessionHandler.authenticatedUser, image.getPhotoUrls);

    return router;
};
