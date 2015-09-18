module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Message = new Schema({
        chatId: String,
        text: String,
        date: {
            type: Date,
            default: Date.now
        },
        show: [String]
    }, {
        collection: 'Messages'
    });

    db.model('Message', Message);
};
