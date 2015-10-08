module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var PushTokens = new Schema({
        userId: String,
        deviceId: String,
        token: String,
        os: {type: String, match: /^APPLE$|^GOOGLE$|^WINDOWS$/, default: 'APPLE'}
    }, {
        collection: 'PushTokens'
    });

    db.model('PushTokens', PushTokens);
};