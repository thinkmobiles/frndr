var SEXUAL = require('../constants/sexual');
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
        distance: Number,
        relationship: [String],
        smoker: Boolean,
        sexual: {
            type: String,
            match: '',
            default: SEXUAL.STRAIGHT
        },
        ageRange: {
            min: {
                type: Number,
                min: CONSTANTS.MIN_AGE,
                max: CONSTANTS.MAX_AGE
            },
            max: {
                type: Number,
                min: CONSTANTS.MIN_AGE,
                max: CONSTANTS.MAX_AGE
            }
        }
    }, {
        collection: 'SearchSettings'
    });

    db.model('SearchSettings', SearchSettings);
};
