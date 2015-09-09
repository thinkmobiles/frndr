var SEXUAL = require('../constants/sexual');
var RELSTATUS = require('../constants/relStatus');

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
                match: '',
                default: RELSTATUS.SINGLE
            },
            jobTitle: String,
            smoker: Boolean,
            sexual: {
                type: String,
                match: '',
                default: SEXUAL.STRAIGHT
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
        pushTokens: [String],
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