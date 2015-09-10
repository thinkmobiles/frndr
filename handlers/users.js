var SessionHandler = require('./sessions');
var async = require('async');


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
            saveData.loc = {};
            saveData.loc.coordinates = data.coordinates;
        }
        
        if (data.pushToken){
            saveData.pushToken = {
                token: data.pushToken
            };
        }

        if (data.os){
            saveData.pushToken.os = os;
        }

        return saveData;
    }

    this.signInClient = function (req, res, next) {
        var options = req.body;
        var saveData;
        var err;

        saveData = prepareSaveData(options);

        if (!options || !options.fbId || (Object.keys(saveData) === 0)) {
            err = new Error('Bad Request');
            err.status = 400;
            return next(err);
        }

        async.waterfall([

                function (cb) {
                    User
                        .findOne({fbId: saveData.fbId}, function (err, userModel) {
                            if (err) {
                                return next(err);
                            }
                        
                            if (!userModel){
                                return cb(null, null);
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

    
    this.getCurrentUser = function (req, res, next) {
        var userId = req.session.userId;

        User
            .findOne({_id: userId}, function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound());
                }
                res.status(200).send(userModel);
            })
    };

    this.getUserById = function (req, res, next) {
        var fbId = req.params.id;

        User
            .findOne({fbId: fbId}, function (err, userModel) {
                if (err) {
                    return next(err);
                }
                if (!userModel) {
                    return next(badRequests.NotFound());
                }
                res.status(200).send(userModel);
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
