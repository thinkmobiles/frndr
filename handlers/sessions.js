
var Session = function ( db ) {

    this.register = function ( req, res, userId, isAdmin ) {
        req.session.loggedIn = true;
        req.session.uId = userId;
        req.session.admin = isAdmin ? true : false;
        res.status( 200 ).send( { success: "Login successful" } );
    };

    this.kill = function ( req, res, next ) {
        if(req.session) {
            req.session.destroy();
        }
        res.status(200).send({ success: "Logout successful" });
    };

    this.authenticatedUser = function ( req, res, next ) {

        if( req.session && req.session.uId && req.session.loggedIn ) {
            next();
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            next(err);
        }

    };

    this.isAdmin = function ( req, res, next ) {
        var err;

        if ( req.session && req.session.admin ) {
            return next()
        }

        err = new Error('permission denied');
        err.status = 403;

        next( err );
    };

    this.isAdminApi = function( req, res, next ) {
        res.status( 403).send({ error: "unauthorized"});
    };

    this.isAuthenticatedUser = function ( req, res, next ) {
        if( req.session && req.session.uId && req.session.loggedIn ) {
            res.status( 200 ).send( { success: "Is authenticated", uId: req.session.uId } );
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            next(err);
        }
    };

};

module.exports = Session;