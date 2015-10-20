var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var mongoose = require('mongoose');
var ImageHandler = require('../handlers/image');
var MessageHandler = require('../handlers/messages');

var async = require('async');
var _ = require('lodash');
var geo = require('geolib');
var ObjectId = mongoose.Types.ObjectId;

var sexualString = '^' + CONSTANTS.SEXUAL.ANY + '$|^' + CONSTANTS.SEXUAL.STRAIGHT + '$|^' + CONSTANTS.SEXUAL.BISEXUAL + '$|^' + CONSTANTS.SEXUAL.LESBIAN + '$';
var sexualRegExp = new RegExp(sexualString);
var osRegExp = new RegExp('^APPLE$|^GOOGLE$|^WINDOWS$');

var relationStatusString = '^' + CONSTANTS.REL_STATUSES.COUPLE + '$|^' + CONSTANTS.REL_STATUSES.FAMILY + '$|^' + CONSTANTS.REL_STATUSES.SINGLE + '$|^' + CONSTANTS.REL_STATUSES.SINGLE_WITH_BABY + '$';
var relationStatusRegExp = new RegExp(relationStatusString);

var sexString = '^' + CONSTANTS.SEX.MALE + '$|^' + CONSTANTS.SEX.FEMALE + '$';
var sexRegExp = new RegExp(sexString);

module.exports = function (app, db) {

    'use strict';

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');
    var Image = db.model('Image');
    var Like = db.model('Like');
    var Contact = db.model('Contact');
    var imageHandler = new ImageHandler(db);
    var messageHandler = new MessageHandler(app, db);

    function removeAvatar(avatarName, callback) {

        if (!avatarName || !avatarName.length) {
            return callback();
        }

        imageHandler.removeImageFile(avatarName, CONSTANTS.BUCKETS.IMAGES, function (err) {
            if (err) {
                return callback(err);
            }

            callback();
        });
    }

    function removeGalleryPhotoes(galleryArrayNames, callback) {

        if (!galleryArrayNames || !galleryArrayNames.length) {
            return callback();
        }

        async.each(galleryArrayNames,

            function (galleryName, cb) {
                imageHandler.removeImageFile(galleryName, CONSTANTS.BUCKETS.IMAGES, cb);
            },

            function (err) {
                if (err) {
                    return callback(err);
                }
                callback();
            });
    }

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

            if (profile.age){

                if (isNaN(profile.age) || profile.age > CONSTANTS.AGE.MAX_AGE || profile.age < CONSTANTS.AGE.MIN_AGE) {
                    return callback(badRequests.InvalidValue({value: profile.age, param: 'age'}));
                }

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

            if (profile.hasOwnProperty('smoker')){

                if (typeof !!profile.smoker !== 'boolean') {
                    return callback(badRequests.InvalidValue({value: profile.smoker, param: 'smoker'}));
                }

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

            if (profile.hasOwnProperty('visible')){

                if (typeof !!profile.visible !== 'boolean') {
                    return callback(badRequests.InvalidValue({value: profile.visible, param: 'visible'}));
                }

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

    function addPushToken(userId, deviceId, pushToken, os, callback){

        var pushTokenModel;

        PushTokens
            .findOne({userId: userId, deviceId: deviceId}, function(err, resultModel){

                if (err){
                    return callback(err);
                }

                if (!resultModel){

                    pushTokenModel = new PushTokens({userId: userId, deviceId: deviceId, token: pushToken, os: os});

                    pushTokenModel
                        .save(function(err){

                            if (err){
                                return callback(err);
                            }

                            callback(null);

                        });

                } else {

                    if (!osRegExp.test(os)) {
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

    }

    function updateUser(userModel, updateData, callback) {
        var uId = userModel.get('_id');
        var coordinates = updateData.coordinates;
        var validateError;

        if (!coordinates || !coordinates.length) {
            return callback(badRequests.NotEnParams({reqParams: 'coordinates'}));
        }

        validateError = validateCoordinates(coordinates);

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

    function deleteUserById(userId, imageId, callback) {
        var objectUserId = ObjectId(userId);

        async.parallel([

                //remove User model
                function(cb){
                    User
                        .remove({_id: objectUserId}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                },

                //remove user from friend list of other users
                function(cb){
                    Contact
                        .find({$or: [{friendId: userId}, {userId: userId}]}, function(err, userModels){
                            if (err){
                                return cb(err);
                            }

                            if (!userModels.length){
                                return cb();
                            }

                            async.each(userModels,

                                function(userModel, eachCb){

                                    userModel.remove(function(err){
                                        if (err){
                                            return eachCb(err);
                                        }

                                        eachCb();
                                    });
                                },

                                function(err){
                                    if (err){
                                        return cb(err);
                                    }

                                    cb();
                                });
                        });
                },

                //remove PushToken model
                function (cb) {
                    PushTokens.remove({userId: userId}, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
                },

                //remove SearchSettings model
                function (cb) {
                    SearchSettings.remove({user: objectUserId}, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
                },

                //remove Like model
                function (cb) {
                    Like.remove({user: objectUserId}, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
                },

                //try to delete all user images from Filesystem
                function (cb) {
                    Image
                        .findOne({_id: imageId}, function (err, imageModel) {
                            var galleryArrayNames;
                            var avatarName;

                            if (err) {
                                return cb(err);
                            }

                            if (!imageModel) {
                                return cb();
                            }
                            avatarName = imageModel.get('avatar');
                            galleryArrayNames = imageModel.get('gallery');

                            async.parallel([

                                    //remove avatar from filesystem
                                    function (parallelCb) {

                                        if (galleryArrayNames.indexOf(avatarName) !== -1){
                                            return parallelCb();
                                        }

                                        removeAvatar(avatarName, parallelCb);
                                    },


                                    //remove gallery photos from filesystem
                                    function (parallelCb) {
                                        removeGalleryPhotoes(galleryArrayNames, parallelCb);
                                    },

                                    //remove Image model
                                    function (parallelCb) {
                                        imageModel
                                            .remove(function (err) {
                                                if (err) {
                                                    return parallelCb(err);
                                                }

                                                parallelCb();
                                            });
                                    }
                                ],

                                function (err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    cb();
                                });


                        })
                },

                //try to remove Messages, or update show array in them
                function (cb) {
                    messageHandler.deleteMessages(userId, function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
                }
            ],

            function (err) {
                if (err) {
                    return callback(err);
                }

                callback();
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
        var limit = CONSTANTS.LIMIT.FIND_USERS;
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
            .populate({path: 'user', select: 'loc blockList'})
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

                    Contact
                        .find({userId: userId}, function(err, resultFriends){

                            if (err){
                                return callback(err);
                            }

                            if (!resultUser || !resultUser.user || !resultUser.user.loc || !resultUser.user.blockList){
                                return callback(badRequests.NotFound({target: 'User'}));
                            }

                            userCoordinates = resultUser.user.loc.coordinates;

                            blockList = _.map(resultUser.user.blockList, function(b){
                                return new ObjectId(b);
                            });

                            friendList = _.map(resultFriends, function(f){
                                return new ObjectId(f.friendId);
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

                            if (resultUser.smoker === CONSTANTS.SEARCH_SMOKER.NON_SMOKER){
                                smokerObj = {
                                    'profile.smoker': false
                                };
                            } else if (resultUser.smoker === CONSTANTS.SEARCH_SMOKER.SMOKER){
                                smokerObj = {
                                    'profile.smoker': true
                                };
                            } else {
                                smokerObj = {};
                            }

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
                                                name: user.profile.name || '',
                                                age: user.profile.age || '',
                                                sex: user.profile.sex,
                                                distance: distance,
                                                sexual: user.profile.sexual,
                                                jobTitle: user.profile.jobTitle || '',
                                                smoker: user.profile.smoker,
                                                likes: user.profile.things,
                                                relStatus: user.profile.relStatus,
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
            });
    }

    function addToBlockListById (userId, blockedId, callback){

        Contact
            .findOne({userId: userId, friendId: blockedId}, function(err, result){

                if (err){
                    return callback(err);
                }

                if (!result) {
                   return callback(null, null);
                }


                result.remove(function (err) {

                    if (err) {
                        return callback(err);
                    }

                    User
                        .findOneAndUpdate({_id: userId}, {$addToSet: {blockList: blockedId}}, function (err) {

                            if (err) {
                                return callback(err);
                            }

                            callback(null);

                        });

                });


            });

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