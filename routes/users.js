var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');
var SearchSettingsHandler = require('../handlers/searchSettings');

module.exports = function(app, db){
    var userHandler = new UserHandler(db);
    var searchSettingsHandler = new SearchSettingsHandler(db);

    router.get('/:id?', userHandler.getUserById);
    router.put('/', userHandler.updateProfile);
    router.delete('/:id', userHandler.deleteUserById);
    router.get('/searchSettings', searchSettingsHandler.getSearchSettings);
    router.put('/searchSettings', searchSettingsHandler.updateSearchSettings);

    return router;
};
