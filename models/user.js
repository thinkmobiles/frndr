var CONSTANTS = require('../constants/index');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var User = new Schema({
        fbId: String,
        profile: {
            name: String,
            age: Number,
            sex: {
                type: String,
                match: /Male|Female/i,
                default: 'Male'
            },
            relStatus: {
                type: String,
                default: CONSTANTS.REL_STATUSES.SINGLE
            },
            jobTitle: String,
            smoker: Boolean,
            sexual: {
                type: String,
                default: CONSTANTS.SEXUAL.STRAIGHT
            },
            things: [String],
            bio: String,
            visible: {
                type: Boolean,
                default: true
            }
        },
        notification: {
            newFriends: {
                type: Boolean,
                default: true
            },
            newMessages: {
                type: Boolean,
                default: true
            }
        },
        friends: [String],
        blockList: [String],
        loc: {
            type: {
                type: String,
                match: /Point\b/,
                default: 'Point'
            },
            coordinates: [Number]
        },
        images: {
            type: ObjectId,
            ref: 'Image'
        }
    }, {
        collection: 'Users'
    });


    db.model('User', User);

};