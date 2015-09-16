var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');
var SearchSettingsHandler = require('../handlers/searchSettings');
var LikeHandler = require('../handlers/likes');
var ImageHandler = require('../handlers/image');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);
    var sessionHandler = new SessionHandler();
    var like = new LikeHandler(db);
    var searchSettingsHandler = new SearchSettingsHandler(db);
    var image = new ImageHandler(db);

    router.get('/friendList', sessionHandler.authenticatedUser, userHandler.getFriendList);
    router.get('/blockFriend/:id', sessionHandler.authenticatedUser, userHandler.blockFriend);
    router.get('/searchSettings', sessionHandler.authenticatedUser, searchSettingsHandler.getSearchSettings);
    router.put('/searchSettings', searchSettingsHandler.updateSearchSettings);
    router.get('/geo/:d', sessionHandler.authenticatedUser, userHandler.findNearestUsers);
    router.get('/like/:id',sessionHandler.authenticatedUser,  like.likeUserById);
    router.get('/dislike/:id', sessionHandler.authenticatedUser, like.dislikesUserById);
    router.get('/:id?', sessionHandler.authenticatedUser, userHandler.getUserById);
    router.put('/notifications', sessionHandler.authenticatedUser, userHandler.updateNotifications);
    router.put('/', sessionHandler.authenticatedUser, userHandler.updateProfile);
    router.delete('/', sessionHandler.authenticatedUser, userHandler.deleteCurrentUser);


    // test

    router.post('/avatar', image.uploadAvatar);
    router.get('')
    return router;
};
