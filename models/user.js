var CONSTANTS = require('../constants/index');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var User = new Schema({
        fbId: String,
        profile: {
            name: String,
            age: Number,
            sex: {
                type: String,
                match: /M|F/i,
                default: 'M'
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
        loc: {
            type: {
                type: String,
                match: /Point\b/,
                default: 'Point'
            },
            coordinates: [Number]
        }
    }, {
        collection: 'Users'
    });


    db.model('User', User);

};