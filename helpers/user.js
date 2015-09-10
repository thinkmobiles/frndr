
module.exports = function(db){

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    
    function createUser(profileData, callback){
        var err;
        var saveObj;
        var location;
        var userModel;
        var pushTokenModel;
        
        if (profileData.constructor === Object){
            
            if (!profileData.fbId || !profileData.pushToken){
                
                err = new Error('Not enought parameters');
                err.status = 400;
                return callback(err);
                
            }
            
            if (profileData.location.length){
                location = {
                    type: 'Point',
                    coordinates: profileData.location;
                }
                
                saveObj = {
                    fbId: profileData.fbId,
                    loc: location
                };
            } else {
                
                saveObj = {
                    fbId: profileData.fbId
                }
                
                userModel = new User(saveObj);
                
                userModel
                    .save(function(err){
                        
                        if (err){
                            return callback(err);
                        }
                    
                        PushTokens.findOne({token: profileData.pushToken}, function(err, resultModel)){
                        
                            if (err){
                                return callback(err);
                            }
                    
                            if (!resultModel){
                    
                                pushTokenModel = new PushTokens({
                                    user: userModel.get('_id'),
                                    token: profileData.pushToken.token,
                                    os: profileData.pushToken.os
                                });
                                
                                pushTokenModel.save(function(err){
                                    if (err){
                                        return callback(err);
                                    }
                                    
                                    callback(null);
                                })
                                
                            }
                                               
                        }
                        
                    
                    });            
            }
                        
            
        }
        
    }
    
    
    return {
        createUser: createUser
    }

}