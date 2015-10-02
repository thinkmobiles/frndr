
var path = require('path');
var apn = require('../helpers/apns')(path.join('config/DevelopmentFrndrAPNS.p12'));
var badRequests = require('../helpers/badRequests');

module.exports = function(db){

    var PushToken = db.model('PushTokens');

    function sendPushNotification(userId, message, options, callback){

        var pushToken;

        if (!callback && typeof options === 'function'){
            callback = options;
            options = {};
        }

        PushToken
            .findOne({user: userId}, {token: 1, os: 1})
            .exec(function(err, resModel){

                if (err){
                    return callback(null);
                }

                if(!resModel){

                    return callback(badRequests.DatabaseError());

                }

                pushToken = resModel.token;

                apn.sendPush(pushToken, message, options);

                callback(null);

            });


    }

    return {
        sendPushNotification: sendPushNotification
    };
};

