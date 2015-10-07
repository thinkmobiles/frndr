
var path = require('path');
var apn = require('../helpers/apns')(path.join('config/DevelopmentFrndrAPNS.p12'));

module.exports = function(db){

    var PushToken = db.model('PushTokens');

    function sendPushNotification(userId, message, options, callback){

        if (!callback && typeof options === 'function'){
            callback = options;
            options = {};
        }

        PushToken
            .find({userId: userId}, {token: 1, os: 1})
            .exec(function(err, resModels){

                if (err){
                    return callback(err);
                }

                if(!resModels.length){
                   return callback(null);
                }

                async.each(resModels,

                    function(pushModel, cb){

                        var pushToken = pushModel.get('token');

                        apn.sendPush(pushToken, message, options);
                        cb(null);

                    }, function(err){

                        if (err){
                            return callback(err);
                        }

                        callback(null);
                    });
            });
    }

    return {
        sendPushNotification: sendPushNotification
    };
};

