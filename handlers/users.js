var SessionHandler = require('./sessions');

var UserHandler = function (db) {
    var User = db.model('User');
    var session = new SessionHandler();

    function prepareSaveData(data) {
        var saveData = {};

        if (data.fbId) {
            saveData.fbId = data.fbId;
        }
        if (data.pushToken) {
            saveData.pushTokens = [];
            saveData.pushTokens.push(data.pushToken);
        }
        if (data.coordinates) {
            saveData.loc = {};
            saveData.loc.coordinates = data.coordinates;
        }

        return saveData;
    }

    function prepareModelToSave(model, data) {

        /*if (data.pushTokens) {
            var tokens = model.get('pushTokens');
            if (tokens.indexOf(data.pushTokens[0]) === -1) {
                tokens.push(data.pushTokens[0]);
                model.set({pushTokens: tokens})
            }
        }*/

        return model;
    }

    this.signInClient = function (req, res, next) {
        var options = req.body;
        var saveData;
        var err;

        saveData = prepareSaveData(options);

        if (!options || (Object.keys(saveData).length === 0) || !saveData.fbId) {
            err = new Error('Bad Request');
            err.status = 400;
            return next(err);
        }


        User
            .findOne({fbId: saveData.fbId})
            .exec(function (err, model) {
                if (err) {
                    return next(err)
                }

                if (model) {
                    //prepareModelToSave(model, saveData);

                    model.save(function (err) {
                        if (err) {
                            return next(err);
                        }
                        return session.register(req, res, model._id.toString());
                    });

                } else {

                    model = new User(saveData);

                    model
                        .save(function (err) {
                            if (err) {
                                return next(err);
                            }

                            return session.register(req, res, model._id.toString());
                        });
                }

            });
    };

    this.signOut = function (req, res, next) {
        session.kill(req, res, next);
    };
};

module.exports = UserHandler;
