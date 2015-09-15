var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var SearchSettingsHandler = function (db) {
    var SearchSettings = db.model('SearchSettings');
    var ObjectId = mongoose.Types.ObjectId;

    function prepareSaveData(options) {
        var saveData = {};

        if (options.distance) {
            saveData.distance = options.distance;
        }

        if (options.relationship && options.relationship.length) {
            saveData.relationship = options.relationship;
        }

        if (options.smoker || (options.smoker === false)) {
            saveData.smoker = options.smoker;
        }

        if (options.sexual) {
            saveData.sexual = options.sexual;
        }

        if (options.ageRange && options.ageRange.min && options.ageRange.max) {
            saveData.ageRange = options.ageRange;
        }

        return saveData;
    }

    this.getSearchSettings = function (req, res, next) {
        var userId = req.session.uId;

        SearchSettings
            .findOne({user: ObjectId(userId)}, {__v: 0, _id: 0}, function (err, searchSettingsModel) {
                if (err) {
                    return next(err);
                }

                if (!searchSettingsModel) {
                    return next(badRequests.NotFound({message: 'Search settings not found'}));
                }

                res.status(200).send(searchSettingsModel);
            })
    };

    this.updateSearchSettings = function (req, res, next) {
        var userId = req.session.uId;
        var saveData = prepareSaveData(req.body);

        if (saveData && Object.keys(saveData).length === 0) {
            return res.status(400).send('Nothing to update');
        }

        SearchSettings
            .findOneAndUpdate({user: ObjectId(userId)}, saveData, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send('Search settings updated successfully');
            });
    };
};

module.exports = SearchSettingsHandler;
