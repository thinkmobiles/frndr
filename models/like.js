module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Like = new Schema({
        user: {
            type: ObjectId,
            ref: 'User'
        },
        likes: [String],
        dislikes: [String]
    }, {
        collection: 'Likes'
    });

    db.model('Like', Like);
};
