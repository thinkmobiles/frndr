
/**
 * @description searchSettings module
 * @module searchSettingsHandler
 *
 */


var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');
var CONSTANTS = require('../constants');
var _ = require('lodash');

var sexualString = '^' + CONSTANTS.SEXUAL.ANY + '$|^' + CONSTANTS.SEXUAL.STRAIGHT + '$|^' + CONSTANTS.SEXUAL.BISEXUAL + '$|^' + CONSTANTS.SEXUAL.LESBIAN + '$';
var sexualRegExp = new RegExp(sexualString);

var relationShipString = '^' + CONSTANTS.SEARCH_REL_STATUSES.COUPLE + '$|^' + CONSTANTS.SEARCH_REL_STATUSES.FAMILY + '$|^' + CONSTANTS.SEARCH_REL_STATUSES.FEMALE_WITH_BABY + '$|^' + CONSTANTS.SEARCH_REL_STATUSES.MALE_WITH_BABY + '$|^' + CONSTANTS.SEARCH_REL_STATUSES.SINGLE_FEMALE + '$|^' + CONSTANTS.SEARCH_REL_STATUSES.SINGLE_MALE + '$';
var relationShipRegExp = new RegExp(relationShipString);

var SearchSettingsHandler = function (db) {

    'use strict';

    var SearchSettings = db.model('SearchSettings');
    var ObjectId = mongoose.Types.ObjectId;

    function prepareSaveData(options, callback) {
        var saveData = {};
        var relation;

        if (options.distance && !isNaN(options.distance)) {
            saveData.distance = options.distance * 1609.344;
        }

        if (options.relationship) {

            relation = options.relationship;

            for ( var i = relation.length; i--; ){
                if (!relationShipRegExp.test(relation[i])){
                    return callback(badRequests.InvalidValue({value: relation[i], param: 'relationship'}));
                }
            }

            saveData.relationship = relation;
        }

        if (options.hasOwnProperty('smoker')){
            if (options.smoker !== true && options.smoker !== false) {
                return callback(badRequests.InvalidValue({value: options.smoker, param: 'smoker'}));
            }

            saveData.smoker = options.smoker;
        }

        if (options.sexual) {

            if (!sexualRegExp.test(options.sexual)){
                return callback(badRequests.InvalidValue({value: options.sexual, param: 'sexual'}));
            }

            saveData.sexual = options.sexual;
        }

        if (options.ageRange){
            if (options.ageRange.min && !isNaN(options.ageRange.min) &&
                (options.ageRange.min >= CONSTANTS.AGE.MIN_AGE) && (options.ageRange.min <= CONSTANTS.AGE.MAX_AGE) &&
                options.ageRange.max && !isNaN(options.ageRange.max) &&
                (options.ageRange.max >= CONSTANTS.AGE.MIN_AGE) && (options.ageRange.max <= CONSTANTS.AGE.MAX_AGE)) {

                saveData.ageRange = options.ageRange;
            } else {
                return callback(badRequests.InvalidValue({value: options.ageRange.min + ' or ' + options.ageRange.max, param: 'ageRange.min or ageRange.max'}));
            }
        }

        return callback(null, saveData);
    }

    this.getSearchSettings = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/searchSettings`__
         *
         * This __method__ allows get _User_ searchSettings
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/searchSettings
         *
         * @example Response example:
         * {
         *  "ageRange": {
         *      "max": 40,
         *      "min": 25
         *   },
         *   "sexual": "Any",
         *   "smoker": false,
         *   "relationship": [],
         *   "distance": 20
         * }
         * @method getSearchSettings
         * @instance
         */

        var userId = req.session.uId;

        SearchSettings
            .findOne({user: ObjectId(userId)}, {user:0, __v: 0, _id: 0}, function (err, searchSettingsModel) {
                if (err) {
                    return next(err);
                }

                if (!searchSettingsModel) {
                    return next(badRequests.NotFound({target: 'Search settings'}));
                }

                searchSettingsModel.distance /= 1609.344;

                res.status(200).send(searchSettingsModel);
            })
    };

    this.updateSearchSettings = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8859`__
         *
         * __URL: `/users/searchSettings`__
         *
         * This __method__ allows update _User's_ searchSettings
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8859/users/searchSettings
         *
         * @example Body example:
         * {
         *  "ageRange": {
         *      "max": 40,
         *      "min": 25
         *   },
         *   "sexual": "Any",
         *   "smoker": false,
         *   "relationship": [],
         *   "distance": 20
         * }
         * @method updateSearchSettings
         * @instance
         */

        var userId = req.session.uId;
        prepareSaveData(req.body, function(err, saveData){

            if (err){
                return next(err);
            }

            if (saveData && Object.keys(saveData).length === 0) {
                return next(badRequests.NotEnParams({reqParams: 'ageRange or sexual or smoker or relationship or distance'}));
            }

            SearchSettings
                .findOneAndUpdate({user: ObjectId(userId)}, saveData, function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'Search settings updated successfully'});
                });
        });

    };
};

module.exports = SearchSettingsHandler;
