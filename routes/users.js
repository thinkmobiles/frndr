var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');
var SearchSettingsHandler = require('../handlers/searchSettings');
var LikeHandler = require('../handlers/likes');
var ImageHandler = require('../handlers/image');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);
    var like = new LikeHandler(db);
    var searchSettingsHandler = new SearchSettingsHandler(db);
    var image = new ImageHandler(db);

    router.get('/searchSettings', searchSettingsHandler.getSearchSettings);
    router.put('/searchSettings', searchSettingsHandler.updateSearchSettings);
    router.get('/geo/:d', userHandler.findNearestUsers);
    router.get('/like/:id', like.likeUserById);
    router.get('/dislike/:id', like.dislikesUserById);
    router.get('/:id?', userHandler.getUserById);
    router.put('/', userHandler.updateProfile);
    router.delete('/:id', userHandler.deleteUserById);


    // test

    router.post('/avatar', image.uploadAvatar);
    return router;
};
