var badRequests = require('../helpers/badRequests');

module.exports = function (db) {

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');

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
        }

        callback(null, userModel);
    }

    function validateCoordinates(coordinates) {
        //var err;
        var longitude;
        var latitude;

        if (!coordinates.length || !coordinates[1]) {
            /* err = new Error('Expected array coordinates');
             err.status = 400;*/
            return badRequests.InvalidValue({message: 'Expected array coordinates'});
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            /* err = new Error('Not valid values for coordinate');
             err.status = 400;*/
            return badRequests.InvalidValue({message: 'Not valid values for coordinate'});
        }

        return;

    }

    function createUser(profileData, callback) {
        //var err;
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
                if (err) {
                    return callback(err);
                }

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

           /* err = new Error('Expected profile data as Object');
            err.status = 400;*/
            return callback(badRequests.InvalidValue({message: 'Expected profile data as Object'}));

        }

    }


    function updateProfile(userModel, updateData, callback) {

        if (Object.keys(updateData).length === 0) {
            return callback(badRequests.NotEnParams({message: 'Nothing to update in Profile'}));
        }

        prepareModelToSave(userModel, updateData, function (err, newUserModel) {

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
        updateProfile: updateProfile,
        getUserById: getUserById,
        deleteUserById: deleteUserById
    }

};