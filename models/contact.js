module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Contact = new Schema({
        userId: String,
        friendId: String,
        lastReadDate: {
            type: Date,
            default: Date.now
        },
        isNewFriend : {type: Boolean, default: true},
        becomesFriendDate: {type: Date, default: Date.now}
    }, {
        collection: 'Contacts'
    });

    db.model('Contact', Contact);
};
