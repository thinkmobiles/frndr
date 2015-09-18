var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var mongoose = require('mongoose');

var async = require('async');
var _ = require('lodash');
var ObjectId = mongoose.Types.ObjectId;

module.exports = function (db) {

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');
    var Image = db.model('Image');

    function prepareModelToSave(userModel, options, callback) {

        if (options.coordinates && options.coordinates.length) {
            var validateError = validateCoordinates(options.coordinates);

            if (validateError && validateError.constructor === Error) {
                return callback(validateError);
            }

            userModel.loc = {
                type: 'Point',
                coordinates: options.coordinates
            };
        }

        if (options.profile) {
            var profile = options.profile;

            if (profile.name) {
                userModel.profile.name = profile.name;
            }

            if (profile.age) {
                userModel.profile.age = profile.age;
            }

            if (profile.relStatus) {
                userModel.profile.relStatus = profile.relStatus;
            }

            if (profile.jobTitle) {
                userModel.profile.jobTitle = profile.jobTitle;
            }

            if (profile.smoker || (profile.smoker === false)) {
                userModel.profile.smoker = profile.smoker;
            }

            if (profile.sexual) {
                userModel.profile.sexual = profile.sexual;
            }

            if (profile.things) {
                userModel.profile.things = profile.things;
            }

            if (profile.bio) {
                userModel.profile.bio = profile.bio;
            }

            if (profile.visible || (profile.visible === false)) {
                userModel.profile.visible = profile.visible;
            }

            if (profile.sex) {
                userModel.profile.sex = profile.sex;
            }
        }

        callback(null, userModel);
    }

    function validateCoordinates(coordinates) {
        var longitude;
        var latitude;

        if (!coordinates.length || !coordinates[1]) {
            return badRequests.InvalidValue({message: 'Expected array coordinates'});
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return badRequests.InvalidValue({message: 'Not valid values for coordinate'});
        }

        return;

    }

    function createUser(profileData, callback) {
        var userModel;
        var pushTokenModel;
        var uId;
        var saveObj;
        var err;
        var searchSettingModel;
        var imageModel;

        if (profileData.constructor === Object) {

            if (!profileData.fbId || !profileData.pushToken || !profileData.os) {
                return callback(badRequests.NotEnParams({message: 'fbId and pushToken and os'}));
            }
            if (!(profileData.os === 'APPLE' || profileData.os === 'GOOGLE' || profileData.os === 'WINDOWS')) {
                return callback(badRequests.InvalidValue({name: 'os'}));
            }

            if (profileData.coordinates && profileData.coordinates.length) {
                err = validateCoordinates(profileData.coordinates);

                if (err) {
                    return callback(err);
                }
            } else {
                return callback(badRequests.NotEnParams({message: 'coordinates'}));
            }

            imageModel = new Image();

            imageModel
                .save(function(err){
                    if (err){
                        return callback(err);
                    }

                    saveObj = {
                        fbId: profileData.fbId,
                        loc: {
                            type: 'Point',
                            coordinates: profileData.coordinates
                        },
                        images: imageModel._id
                    };

                    userModel = new User(saveObj);

                    userModel
                        .save(function (err) {
                            if (err) {
                                return callback(err);
                            }

                            PushTokens.findOne({token: profileData.pushToken}, function (err, resultModel) {
                                if (err) {
                                    return callback(err);
                                }

                                uId = userModel.get('_id');

                                searchSettingModel = new SearchSettings({user: uId});

                                if (!resultModel) {
                                    pushTokenModel = new PushTokens({
                                        user: uId,
                                        token: profileData.pushToken,
                                        os: profileData.os
                                    });

                                    pushTokenModel.save(function (err) {
                                        if (err) {
                                            return callback(err);
                                        }


                                        searchSettingModel.save(function(err){
                                            if (err){
                                                return callback(err);
                                            }

                                            callback(null, uId);
                                        });
                                    });

                                } else {

                                    searchSettingModel.save(function(err){
                                        if (err){
                                            return callback(err);
                                        }

                                        callback(null, uId);
                                    });

                                }

                            });

                        });


                });

        } else {
            return callback(badRequests.InvalidValue({message: 'Expected profile data as Object'}));
        }

    }

    function updateUser(userModel, updateData, callback) {
        var uId = userModel.get('_id');

        function updateCoordinates(coordinates, cb) {
            if (coordinates && coordinates.length) {
                var validateError = validateCoordinates(coordinates);

                if (validateError && validateError.constructor === Error) {
                    return callback(validateError);
                }

                userModel.loc = {
                    type: 'Point',
                    coordinates: coordinates
                };

                userModel
                    .save(function (err) {

                        if (err) {
                            return cb(err);
                        }


                        cb(null);

                    });
            } else {
                cb(null);
            }
        }

        function updatePushToken(pushToken, os, cb) {
            var updateObj;
            if (pushToken) {

                if (os) {
                    updateObj = {token: pushToken, os: os};
                } else {
                    updateObj = {token: pushToken}
                }

                PushTokens
                    .findOneAndUpdate({user: uId}, updateObj)
                    .exec(function (err) {

                        if (err) {
                            return cb(err);
                        }

                        cb(null);

                    });
            } else {
                cb(null)
            }

        }
        // TODO remove apply
        async
            .parallel([

                async.apply(updateCoordinates, updateData.coordinates),
                async.apply(updatePushToken, updateData.pushToken, updateData.os)

            ], function (err) {

                if (err) {
                    return callback(err);
                }

                callback(null, uId);

            });
    }

    function updateProfile(userModel, updateData, callback) {

        if (Object.keys(updateData).length === 0) {
            return callback(badRequests.NotEnParams({message: 'Nothing to update in Profile'}));
        }

        prepareModelToSave(userModel, updateData, function (err, newUserModel) {

            if (err) {
                return callback(err);
            }

            newUserModel
                .save(function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback();
                });
        });
    }

    function getUserById(userId, callback) {
        User
            .findOne({_id: userId},
            {
                fbId: 0,
                __v: 0
            },
            function (err, userModel) {
                if (err) {
                    return callback(err);
                }
                if (!userModel) {
                    return callback(badRequests.NotFound({message: 'User not found'}));
                }
                callback(null, userModel);
            })
    }

    function deleteUserById(userId, callback) {
        User
            .remove({_id: userId}, function (err) {
                if (err) {
                    return callback(err);
                }

                callback(null);
            });
    }

    function getAllUseBySearchSettings (userId, callback){

        var userCoordinates;
        var relStatusArray = [];
        var relStatusObj;
        var ageObj;
        var geoObj;
        var sexualObj;
        var relationship;
        var smokerObj;
        var visibleObj;
        var friendObj;
        var blockedObj;
        var blockList;
        var friendList;
        var findObj;
        var projectionObj;

        SearchSettings.findOne({user: userId}, {_id: 0, __v: 0})
            .populate({path: 'user', select: 'loc friends blockList'})
            .exec(function(err, resultUser){

                if (err){
                    return callback(err);
                }

                if (!resultUser || !resultUser.user || !resultUser.user.loc || !resultUser.friends || !resultUser.blockList){
                    badRequests.NotFound({message: 'User not found'});
                }

                userCoordinates = resultUser.user.loc.coordinates;

                blockList = _.map(resultUser.blockList, function(b){
                    return new ObjectId(b);
                });

                friendList = _.map(resultUser.friends, function(f){
                    return new ObjectId(f);
                });

                friendObj = {
                    _id: {$nin: friendList}
                };

                blockedObj = {
                    _id: {$nin: blockList}
                };

                visibleObj = {
                    'profile.visible': true
                };

                geoObj = {
                    loc: {
                        $geoWithin: {
                            $centerSphere: [userCoordinates, resultUser.distance / 3963.2]
                        }
                    }
                };

                ageObj = {
                    $and: [
                        {'profile.age': {$lte: resultUser.ageRange.max}},
                        {'profile.age': {$gte: resultUser.ageRange.min}}
                    ]
                };

                sexualObj = {
                    'profile.sexual': resultUser.sexual
                };

                smokerObj = {
                    'profile.smoker': resultUser.smoker
                };

                if (!resultUser.relationship.length){
                    relStatusArray = [];
                } else {

                    relationship = _.clone(resultUser.relationship);

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.SINGLE_MALE) !== -1){
                        relStatusArray.push({'profile.sex': 'M', 'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE});
                    }

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.SINGLE_FEMALE) !== -1){
                        relStatusArray.push({'profile.sex': 'F', 'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE});
                    }

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.COUPLE) !== -1){
                        relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.COUPLE});
                    }

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.FAMILY) !== -1){
                        relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.FAMILY});
                    }

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.MALE_WITH_BABY) !== -1){
                        relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY, 'profile.sex': 'M'});
                    }

                    if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.FEMALE_WITH_BABY) !== -1){
                        relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY, 'profile.sex': 'F'});
                    }

                }

                if (!relStatusArray.length){
                    relStatusObj = {};
                } else {
                    relStatusObj = {
                        $or: relStatusArray
                    };
                }

                findObj = {
                    $and: [
                        visibleObj,
                        geoObj,
                        relStatusObj,
                        ageObj,
                        sexualObj,
                        smokerObj,
                        blockedObj,
                        friendObj
                    ]
                };

                projectionObj = {
                    'fbId': 0,
                    'images._id': 0,
                    '__v': 0,
                    'loc': 0,
                    'notification': 0
                };

                User
                    .find(
                        findObj,
                        projectionObj
                    )
                    .populate({path: 'images', select: '-_id avatar gallery'})
                    .exec(function(err, resultUsers){
                        if (err){
                            return callback(err);
                        }

                        callback(null, resultUsers);

                    });

            });
    }

    function addToBlockListById (userId, blockedId, callback){

        getUserById(userId, function (err, userModel) {
            var index;
            var friendList;

            if (err) {
                return callback(err);
            }

            if (userModel.blockList.indexOf(blockedId) === -1) {
                userModel.blockList.push(blockedId);
            }

            friendList = userModel.get('friends');
            index = friendList.indexOf(blockedId);

            if (index !== -1){
                friendList.splice(index, 1);
                userModel.friends = friendList;
            }

            userModel
                .save(function(err){
                    if (err){
                        return callback(err);
                    }

                    callback(null, userModel);
                });
        })
    };

    return {
        createUser: createUser,
        updateUser: updateUser,
        updateProfile: updateProfile,
        getUserById: getUserById,
        deleteUserById: deleteUserById,
        getAllUseBySearchSettings: getAllUseBySearchSettings,
        addToBlockListById: addToBlockListById
    };

};