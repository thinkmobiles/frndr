module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var PushTokens = new Schema({
        user: {
            type: ObjectId,
            ref: 'User'
        },
        token: String,
        os: {type: String, default: 'APPLE'}
    }, {
        collection: 'PushTokens'
    });

    db.model('PushTokens', PushTokens);
};