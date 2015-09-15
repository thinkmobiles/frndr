module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Image = new Schema({
        user: {
            type: ObjectId,
            ref: 'User'
        },
        avatar: String,
        gallery: [String]
    }, {
        collection: 'Images'
    });

    db.model('Image', Image);
};

