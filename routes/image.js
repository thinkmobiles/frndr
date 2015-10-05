
var express = require('express');
var router = express.Router();

var ImageHandler = require('../handlers/image');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var sessionHandler = new SessionHandler();
    var image = new ImageHandler(db);

    router.post('/avatar', sessionHandler.authenticatedUser, image.uploadAvatar);
    router.put('/avatar', sessionHandler.authenticatedUser, image.changeAvatarFromGallery);
    router.delete('/avatar', sessionHandler.authenticatedUser, image.removeAvatar);
    router.get('/avatar', sessionHandler.authenticatedUser, image.getAvatarUrl);
    router.post('/photo', sessionHandler.authenticatedUser, image.uploadPhotoToGallery);
    router.delete('/photo', sessionHandler.authenticatedUser, image.removeImageFromGallery);
    router.get('/photo/:id?', sessionHandler.authenticatedUser, image.getPhotoUrls);
    router.get('/managePhotos', sessionHandler.authenticatedUser, image.getAvatarAndGallery);


    //router.get('/test', image.testResizeImage);

    return router;
};
