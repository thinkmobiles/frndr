var CONSTANTS = require('../constants/index');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var SearchSettings = new Schema({
        user: {
            type: ObjectId,
            ref: 'User'
        },
        distance: {type: Number, default: 2000000 * 1609.344},
        relationship: [String],
        smoker: {type: Boolean, default: false},
        sexual: {
            type: String,
            default: CONSTANTS.SEXUAL.ANY
        },
        ageRange: {
            min: {
                type: Number,
                min: CONSTANTS.AGE.MIN_AGE,
                max: CONSTANTS.AGE.MAX_AGE,
                default: 25
            },
            max: {
                type: Number,
                min: CONSTANTS.AGE.MIN_AGE,
                max: CONSTANTS.AGE.MAX_AGE,
                default: 40
            }
        }
    }, {
        collection: 'SearchSettings'
    });

    db.model('SearchSettings', SearchSettings);
};
