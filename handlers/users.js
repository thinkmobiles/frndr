var SessionHandler = require('./sessions');

var UserHandler = function(db){
    var User = db.model('User');
    var session = new SessionHandler();

    this.signInClient = function ( req, res, next ) {
        var body = req.body;
        var fbId = body.fbId;
        var pushToken = body.pushToken;
        var pushTokensArray = [];

        pushTokensArray = pushTokensArray.push(pushToken);

        var options = {
            fbId: fbId,
            pushTokens: pushTokensArray
        };

        var err;

        if ( !body || !fbId || !pushToken ) {
            err = new Error('Bad Request');
            err.status = 400;
            return next( err );
        }

        User
            .findOne( { fbId: fbId })
            .exec( function ( err, model ) {
                if (err) {
                    return next(err)
                }

                if (model) {
                    if (model.pushTokens.indexOf(pushToken) === -1){
                        model.pushTokens = model.pushTokens.push(pushToken);
                    }

                    model.save(function(err){
                        if (err){
                            return next(err);
                        }
                        return session.register(req, res, model._id.toString());
                    });

                } else {

                    model = new User(options);

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

    this.signOut = function ( req, res, next ) {
        session.kill( req, res, next );
    };
};

module.exports = UserHandler;
