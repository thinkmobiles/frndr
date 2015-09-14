var badRequests = require('../helpers/badRequests');

var async = require('async');

module.exports = function (db) {

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');

    function prepareModelToSave(userModel, options, callback) {

        if (options.fbId) {
            userModel.fbId = options.fbId;
        }

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
            /*if (profile.things) {
             userModel.profile.things = profile.things;
             }*/
            if (profile.bio) {
                userModel.profile.bio = profile.bio;
            }
            if (profile.visible) {
                userModel.profile.visible = profile.visible;
            }
        }

        callback(null, userModel);
    }

    function validateCoordinates(coordinates) {
        var err;
        var longitude;
        var latitude;

        if (!coordinates.length || !coordinates[1]) {
            err = new Error('Expected array coordinates');
            err.status = 400;
            return err;
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            err = new Error('Not valid values for coordinate');
            err.status = 400;
            return err;
        }

        return;

    }

    function createUser(profileData, callback) {
        var err;
        var userModel;
        var pushTokenModel;
        var uId;

        if (profileData.constructor === Object) {

            if (!profileData.fbId || !profileData.pushToken || !profileData.os) {
                return callback(badRequests.NotEnParams({required: 'fbId and pushToken and os'}));
            }
            if (!(profileData.os === 'APPLE' || profileData.os === 'GOOGLE' || profileData.os === 'WINDOWS')) {
                return callback(badRequests.InvalidValue({name: 'os'}));
            }

            userModel = new User();
            prepareModelToSave(userModel, profileData, function (err, newUserModel) {

                newUserModel
                    .save(function (err) {
                        if (err) {
                            return callback(err);
                        }

                        PushTokens.findOne({token: profileData.pushToken}, function (err, resultModel) {
                            if (err) {
                                return callback(err);
                            }

                            uId = userModel.get('_id');

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

                                    callback(null, uId);
                                });

                            } else {
                                callback(null, uId);
                            }

                        });

                    });
            });


        } else {

            err = new Error('Expected profile data as Object');
            err.status = 400;
            return callback(err);

        }

    }

    function updateUser(userModel, updateData, callback) {
        var uId = userModel.get('_id');
        var err;

        function updateCoordinates(coordinates, cb){
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

        function updatePushToken (pushToken, os, cb) {
            var updateObj;
            if (pushToken){

                if (os) {
                    updateObj = {token: pushToken, os: os};
                } else {
                    updateObj = {token: pushToken}
                }

                PushTokens
                    .findOneAndUpdate({user: uId}, updateObj)
                    .exec(function(err){

                        if (err){
                            return cb(err);
                        }

                        cb(null);

                    });
            } else {
                cb(null)
            }

        }

         async
             .series([
                 async.apply(updateCoordinates, updateData.coordinates),
                 async.apply(updatePushToken, updateData.pushToken, updateData.os)
             ], function(err){

                 if (err){
                     return callback(err);
                 }

                 callback(null, uId);

             });
    }

    function updateProfile(userModel, updateData, callback) {
        var uId = userModel.get('_id');

        if (Object.keys(updateData).length === 0) {
            return callback(badRequests.NotEnParams());
        }

        prepareModelToSave(userModel, updateData, function (err, newUserModel) {

            newUserModel
                .save(function (err) {
                    var tokenObj;
                    if (err) {
                        return callback(err);
                    }

                    if (updateData.pushToken && updateData.os) {
                        if (!(updateData.os === 'APPLE' || updateData.os === 'GOOGLE' || updateData.os === 'WINDOWS')) {
                            return callback(badRequests.InvalidValue({name: 'os'}));
                        }

                        tokenObj = {
                            token: updateData.pushToken,
                            os: updateData.os

                        };

                        PushTokens
                            .findOneAndUpdate({user: uId}, {
                                $set: {
                                    token: tokenObj.token,
                                    os: tokenObj.os
                                }
                            }, function (err) {
                                if (err) {
                                    return callback(err);
                                }

                                callback(null, uId);

                            });
                    } else {
                        callback(null, uId);
                    }
                });
        });


    }

    function getUserById(userId, callback) {
        User
            .findOne({_id: userId}, {fbId: 0, __v: 0}, function (err, userModel) {
                if (err) {
                    return callback(err);
                }
                if (!userModel) {
                    return callback(badRequests.NotFound());
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
                callback();
            })
    }

    /*function getAllUserbyGeoLocation ()*/

    return {
        createUser: createUser,
        updateUser: updateUser,
        updateProfile: updateProfile,
        getUserById: getUserById,
        deleteUserById: deleteUserById
    };

};