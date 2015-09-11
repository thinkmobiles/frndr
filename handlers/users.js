var SessionHandler = require('./sessions');
var async = require('async');
var badRequests = require('../helpers/badRequests');


var UserHandler = function (db) {
    var User = db.model('User');
    var session = new SessionHandler();
    var userHelper = require('../helpers/user')(db);

    function prepareSaveData(data) {
        var saveData = {};

        if (data.fbId) {
            saveData.fbId = data.fbId;
        }
        
        if (data.coordinates) {
            saveData.loc = {
                coordinates : data.coordinates
            };
        }
        
        if (data.pushToken){
            saveData.pushToken = {
                token: data.pushToken
            };
        }

        if (data.os){
            saveData.pushToken.os = data.os;
        }

        return saveData;
    }

    this.signInClient = function (req, res, next) {
        var options = req.body;
        var saveData;
        var err;

        saveData = prepareSaveData(options);

        if (!options || !options.fbId || (Object.keys(saveData) === 0)) {
            return next(badRequests.NotEnParams({required:'fbId'}));
        }

        async.waterfall([

                function (cb) {
                    User
                        .findOne({fbId: saveData.fbId}, function (err, userModel) {
                            if (err) {
                                return next(err);
                            }
                            cb(null, userModel);
                        });
                },

                function (userModel, cb) {

                    if (!userModel) {
                        userHelper.createUser(saveData, cb);
                    } else {
                        userHelper.updateUser(userModel, saveData, cb);
                    }
                        
                }

            ],
            function (err, uId) {
                if (err) {
                    return next(err);
                }
                return session.register(req, res, uId.toString());
            });

    };

    this.signOut = function (req, res, next) {
        session.kill(req, res, next);
    };

    this.getUserById = function (req, res, next) {

        var userId = req.params.id || req.session.uId;

        userHelper.getUserById(userId, function(err, userModel){
            if(err){
                return next(err);
            }
            res.status(200).send(userModel);
        })
    };

    this.deleteUserById = function (req, res, next) {
        var userId = req.params.id;

        userHelper.deleteUserById(userId, function(err){
            if(err){
                return next(err);
            }
            res.status(200).send({success:'User was removed successfully'});
        })
    };

    this.likeUserById = function (req, res, next) {
        var userId = req.session.userId;
        var likeUserId = req.body.likeId;

        if (!likeUserId) {
            return next(badRequests.NotEnParams({require: 'likeId'}));
        }

        //res.status(201).send({success:'You like successfull'});
    };
};

module.exports = UserHandler;
