
module.exports = function(db){

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');

    function validateCoordinates (coordinates){
        var err;
        var longitude;
        var latitude;

        if (!coordinates.length || !coordinates[1]){
            err = new Error('Expected array coordinates');
            err.status = 400;
            return err;
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90){
            err = new Error('Not valid values for coordinate');
            err.status = 400;
            return err;
        }

        return;

    }
    
    function createUser(profileData, callback){
        var err;
        var saveObj;
        var location;
        var userModel;
        var pushTokenModel;
        var uId;
        var locationObj = profileData.loc;
        var validationErr;
        
        if (profileData.constructor === Object){
            
            if (!profileData.fbId || !profileData.pushToken){
                
                err = new Error('Not enought parameters');
                err.status = 400;
                return callback(err);
                
            }
            
            if (locationObj && locationObj.coordinates && locationObj.coordinates.length){

                validationErr = validateCoordinates(locationObj.coordinates);

                if (validationErr && validationErr.constructor === Error){
                    return callback(validationErr);
                }

                location = {
                    type: 'Point',
                    coordinates: locationObj.coordinates
                };
                
                saveObj = {
                    fbId: profileData.fbId,
                    loc: location
                };
            } else {

                saveObj = {
                    fbId: profileData.fbId
                };
            }
                userModel = new User(saveObj);
                
                userModel
                    .save(function(err){
                        
                        if (err){
                            return callback(err);
                        }
                    
                        PushTokens.findOne({token: profileData.pushToken.token}, function(err, resultModel){
                        
                            if (err){
                                return callback(err);
                            }
                    
                            if (!resultModel){
                                
                                uId = userModel.get('_id');
                    
                                pushTokenModel = new PushTokens({
                                    user: uId,
                                    token: profileData.pushToken.token,
                                    os: profileData.pushToken.os
                                });
                                
                                pushTokenModel.save(function(err){
                                    if (err){
                                        return callback(err);
                                    }
                                    
                                    callback(null, uId);
                                });

                            } else {
                                callback(null, uId);
                            }
                                               
                        });
                    
                    });
        } else {

            err = new Error('Expected profile data as Object');
            err.status = 400;
            return callback(err);

        }
        
    }

    function updateUser (userModel, updateData, callback) {
        var tokenObj = updateData.pushToken;
        var uId = userModel.get('_id');

        userModel.loc.coordinates = updateData.loc.coordinates;

        userModel
            .save(function(err){
                if (err){
                    return callback(err);
                }

                PushTokens
                    .findOneAndUpdate({user: uId}, {$set: {token: tokenObj.token, os: tokenObj.os}}, function(err){
                        if (err){
                            return callback(err);
                        }

                        callback(null, uId);

                    });
            });
    }
    
    
    return {
        createUser: createUser,
        updateUser: updateUser
    }

};