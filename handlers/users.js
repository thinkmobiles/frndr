var SessionHandler = require('./sessions');
var async = require('async');

var UserHandler = function (db) {
    var User = db.model('User');
    var session = new SessionHandler();

    function prepareSaveData(data) {
        var saveData = {};

        if (data.fbId){
            saveData.fbId = data.fbId;
        }
        if (data.coordinates) {
            saveData.loc = {};
            saveData.loc.coordinates = data.coordinates;
        }

        return saveData;
    }

    this.signInClient = function (req, res, next) {
        var options = req.body;
        var saveData;
        var err;

        saveData = prepareSaveData(options);

        if (!options || !options.fbId) {
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
                                userModel = new User(saveData);
                            } else {
                                userModel.set(saveData);
                            }
                                cb (null, userModel);
                        });
                },

                function(userModel, cb){

                    userModel.save(function(err){
                        if (err){
                            return cb (err);
                        }
                        cb (null, userModel);
                    })
                },

                function (userModel, cb) {
                    //pushTokens

                    cb(null, userModel);
                }
            ],
            function (err, userModel) {
                if (err) {
                    return next(err);
                }
                return session.register(req, res, userModel._id.toString());
            });

    };

    this.signOut = function (req, res, next) {
        session.kill(req, res, next);
    };

    this.createUser = function(req, res, next){

    };
};

module.exports = UserHandler;
