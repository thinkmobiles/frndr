var badRequests = require('../helpers/badRequests');

var async = require('async');

module.exports = function (db) {

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var SearchSettings = db.model('SearchSettings');

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

            if (profile.smoker) {
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

            if (profile.visible) {
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

            saveObj = {
                fbId: profileData.fbId,
                loc: {
                    type: 'Point',
                    coordinates: profileData.coordinates
                }
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
                __v: 0,
                friends: 0,
                blockList: 0,
                notification: 0,
                loc: 0
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

    function getAllUserByGeoLocation (userId, distance, callback){

        var userCoordinates;

        User.findOne({_id: userId})
            .exec(function(err, resultUser){

                if (err){
                    return callback(err);
                }

                if (!resultUser){
                    badRequests.NotFound({message: 'User not found'});
                }

                userCoordinates = resultUser.loc.coordinates;

                User
                    .find({$and:
                            [{
                                loc: {
                                    $geoWithin: {
                                        $centerSphere: [userCoordinates, distance / 3963.2]
                                    }
                                }
                            },{
                                _id: {$ne: userId}
                            }]
                        }, {__v: 0})
                    .exec(function(err, resultUsers){

                        if (err){
                            return callback(err);
                        }

                        callback(null, resultUsers);

                    });

            });
    };

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
        createUser               : createUser,
        updateUser               : updateUser,
        updateProfile            : updateProfile,
        getUserById              : getUserById,
        deleteUserById           : deleteUserById,
        getAllUserByGeoLocation  : getAllUserByGeoLocation,
        addToBlockListById       : addToBlockListById
    };

};