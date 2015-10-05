var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var mongoose = require('mongoose');
var ImageHandler = require('../handlers/image');

var async = require('async');
var _ = require('lodash');
var geo = require('geolib');
var ObjectId = mongoose.Types.ObjectId;

var sexualString = CONSTANTS.SEXUAL.ANY + '|' + CONSTANTS.SEXUAL.STRAIGHT + '|' + CONSTANTS.SEXUAL.BISEXUAL + '|' + CONSTANTS.SEXUAL.LESBIAN;
var sexualRegExp = new RegExp(sexualString);

var relationStatusString = CONSTANTS.REL_STATUSES.COUPLE + '|' + CONSTANTS.REL_STATUSES.FAMILY + '|' + CONSTANTS.REL_STATUSES.SINGLE + '|' + CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY;
var relationStatusRegExp = new RegExp(relationStatusString);

var sexString = CONSTANTS.SEX.MALE + '|' + CONSTANTS.SEX.FEMALE;
var sexRegExp = new RegExp(sexString);

module.exports = function (db) {

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');
    var Image = db.model('Image');
    var Like = db.model('Like');
    var imageHandler = new ImageHandler(db);

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

            if (profile.age && !isNaN(profile.age) && (profile.age <= CONSTANTS.AGE.MAX_AGE && profile.age >= CONSTANTS.AGE.MIN_AGE)) {
                userModel.profile.age = profile.age;
            }

            if (profile.relStatus) {

                if (!relationStatusRegExp.test(profile.relStatus)){
                    return callback(badRequests.InvalidValue({value: profile.relStatus, param: 'relation status'}));
                }

                userModel.profile.relStatus = profile.relStatus;
            }

            if (profile.jobTitle) {
                userModel.profile.jobTitle = profile.jobTitle;
            }

            if ((profile.smoker === true) || (profile.smoker === false)) {
                userModel.profile.smoker = profile.smoker;
            }

            if (profile.sexual) {

                if (!sexualRegExp.test(profile.sexual)){
                    return callback(badRequests.InvalidValue({value: profile.sexual, param: 'sexual orientation'}));
                }

                userModel.profile.sexual = profile.sexual;
            }

            if (profile.things) {
                userModel.profile.things = profile.things;
            }

            if (profile.bio) {
                userModel.profile.bio = profile.bio;
            }

            if ((profile.visible === true) || (profile.visible === false)) {
                userModel.profile.visible = profile.visible;
            }

            if (profile.sex) {

                if (!sexRegExp.test(profile.sex)){
                    return callback(badRequests.InvalidValue({value: profile.sex, param: 'sex'}));
                }

                userModel.profile.sex = profile.sex;
            }
        }

        callback(null, userModel);
    }

    function validateCoordinates(coordinates) {
        var longitude;
        var latitude;

        if (!Array.isArray(coordinates) || coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
            return badRequests.InvalidValue({value: coordinates, param: 'coordinates'});
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return badRequests.InvalidValue({message: 'Longitude must be within (-180; 180). Latitude must be within (-90; 90) '});
        }

        return;

    }

    function createUser(profileData, callback) {
        var userModel;
        var uId;
        var saveObj;
        var err;
        var searchSettingModel;
        var imageModel;

        if (profileData.coordinates) {
            err = validateCoordinates(profileData.coordinates);

            if (err) {
                return callback(err);
            }

        } else {
            return callback(badRequests.NotEnParams({reqParams: 'coordinates'}));
        }

        imageModel = new Image();

        imageModel
            .save(function (err) {
                if (err) {
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

                        uId = userModel.get('_id');

                        searchSettingModel = new SearchSettings({user: uId});

                        searchSettingModel.save(function (err) {
                            if (err) {
                                return callback(err);
                            }

                            callback(null, uId);
                        });


                    });

            });
    }

    function addPushToken(userId, pushToken, os, callback){

        var pushTokenModel;

        PushTokens
            .findOne({user: userId}, function(err, resultModel){

                if (err){
                    return callback(err);
                }

                if (!resultModel){

                    pushTokenModel = new PushTokens({user: userId, token: pushToken, os: os});

                    pushTokenModel
                        .save(function(err){

                            if (err){
                                return callback(err);
                            }

                            callback(null);

                        });

                } else {

                    if (!(os === 'APPLE' || os === 'GOOGLE' || os === 'WINDOWS')) {
                        return callback(badRequests.InvalidValue({value: os, param: 'os'}));
                    }

                    resultModel.update({$set: {token: pushToken, os: os}}, function(err){

                        if (err){
                            return callback(err);
                        }

                        callback(null);

                    });

                }

            });

    };

    function updateUser(userModel, updateData, callback) {
        var uId = userModel.get('_id');
        var coordinates = updateData.coordinates;

        if (!coordinates || !coordinates.length) {
            return callback(badRequests.NotEnParams({reqParams: 'coordinates'}));
        }

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
                    return callback(err);
                }

                callback(null, uId);

            });
    }

    function updateProfile(userModel, updateData, callback) {

        if (Object.keys(updateData).length === 0) {
            return callback(badRequests.NotEnParams({reqParams: 'profile'}));
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
                    return callback(badRequests.NotFound({target: 'User'}));
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

    function getAllUsersBySearchSettings (userId, page, callback){

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
        var notIObj;
        var limit = 10;
        var foundedUsers = [];
        var userObj;
        var gallery;
        var galleryUrls;
        var avatarUrl;
        var distance;
        var likesArray;
        var likesObj = {};
        var disLikeArray;
        var disLikeObj = {};

        SearchSettings.findOne({user: userId}, {_id: 0, __v: 0})
            .populate({path: 'user', select: 'loc friends blockList'})
            .exec(function(err, resultUser){

                if (err){
                    return callback(err);
                }

                Like.findOne({user: userId}, {_id: 0, __v: 0}, function(err, likesModel){

                    if (err){
                        return callback(err);
                    }

                    if (likesModel){

                        if (likesModel.likes.length){
                            likesArray = _.map(likesModel.likes, function(l){
                               return new ObjectId(l)
                            });

                            likesObj = {
                                _id: {$nin: likesArray}
                            }
                        }

                        if (likesModel.dislikes.length){
                            disLikeArray = _.map(likesModel.dislikes, function(d){
                               return new ObjectId(d);
                            });

                            disLikeObj = {
                                _id: {$nin: disLikeArray}
                            }
                        }

                    }

                    if (!resultUser || !resultUser.user || !resultUser.user.loc || !resultUser.friends || !resultUser.blockList){
                        badRequests.NotFound({target: 'User'});
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
                                $centerSphere: [userCoordinates, resultUser.distance / 6378137]
                            }
                        }
                    };

                    ageObj = {
                        $and: [
                            {'profile.age': {$lte: resultUser.ageRange.max}},
                            {'profile.age': {$gte: resultUser.ageRange.min}}
                        ]
                    };

                    notIObj = {
                        '_id': {$ne: userId}
                    };

                    if (resultUser.sexual === CONSTANTS.SEXUAL.ANY){

                        sexualObj = {};

                    } else {

                        sexualObj = {
                            'profile.sexual': resultUser.sexual
                        };

                    }

                    smokerObj = {
                        'profile.smoker': resultUser.smoker
                    };

                    if (!resultUser.relationship.length){
                        relStatusArray = [];
                    } else {

                        relationship = _.clone(resultUser.relationship);

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.SINGLE_MALE) !== -1){
                            relStatusArray.push({'profile.sex': CONSTANTS.SEX.MALE, 'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE});
                        }

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.SINGLE_FEMALE) !== -1){
                            relStatusArray.push({'profile.sex': CONSTANTS.SEX.FEMALE, 'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE});
                        }

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.COUPLE) !== -1){
                            relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.COUPLE});
                        }

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.FAMILY) !== -1){
                            relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.FAMILY});
                        }

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.MALE_WITH_BABY) !== -1){
                            relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY, 'profile.sex': CONSTANTS.SEX.MALE});
                        }

                        if (relationship.indexOf(CONSTANTS.SEARCH_REL_STATUSES.FEMALE_WITH_BABY) !== -1){
                            relStatusArray.push({'profile.relStatus': CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY, 'profile.sex': CONSTANTS.SEX.FEMALE});
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
                            geoObj,
                            visibleObj,
                            relStatusObj,
                            ageObj,
                            sexualObj,
                            smokerObj,
                            blockedObj,
                            likesObj,
                            disLikeObj,
                            friendObj,
                            notIObj
                        ]
                    };

                    projectionObj = {
                        'fbId': 0,
                        '__v': 0,
                        'notification': 0
                    };

                    User
                        .find(
                        findObj,
                        projectionObj
                    )
                        .populate({path: 'images', select: '-_id avatar gallery'})
                        .skip(limit * (page - 1))
                        .limit(limit)
                        .exec(function(err, resultUsers){
                            if (err){
                                return callback(err);
                            }

                            async.each(resultUsers,

                                function(user, cb){

                                    if (!user.images || !user.images.gallery ){
                                        return callback(badRequests.DatabaseError());
                                    }

                                    gallery = user.images.gallery;

                                    galleryUrls = gallery.map(function(g){
                                        return imageHandler.computeUrl(g, CONSTANTS.BUCKETS.IMAGES);
                                    });

                                    avatarUrl = user.images.avatar ? imageHandler.computeUrl(user.images.avatar, CONSTANTS.BUCKETS.IMAGES) : '';

                                    distance = geo.getDistance(
                                        {latitude: resultUser.user.loc.coordinates[1], longitude: resultUser.user.loc.coordinates[0]},
                                        {latitude: user.loc.coordinates[1], longitude: user.loc.coordinates[0]}, 1
                                    );

                                    distance = geo.convertUnit('mi', distance, 20);

                                    userObj = {
                                        userId: user._id,
                                        avatar: avatarUrl,
                                        name: user.profile.name,
                                        age: user.profile.age,
                                        distance: distance,
                                        sexual: user.profile.sexual,
                                        jobTitle: user.profile.jobTitle,
                                        smoker: user.profile.smoker,
                                        likes: user.profile.things,
                                        bio: user.profile.bio || '',
                                        gallery: galleryUrls
                                    };

                                    foundedUsers.push(userObj);

                                    cb(null);

                                },  function(err){

                                    if (err){
                                        return callback(err);
                                    }

                                    callback(null, foundedUsers);

                                });

                        });

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
    }

    return {
        createUser: createUser,
        updateUser: updateUser,
        updateProfile: updateProfile,
        getUserById: getUserById,
        deleteUserById: deleteUserById,
        getAllUsersBySearchSettings: getAllUsersBySearchSettings,
        addToBlockListById: addToBlockListById,
        addPushToken: addPushToken
    };

};