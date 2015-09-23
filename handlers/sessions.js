
var Session = function () {

    this.register = function ( req, res, userId ) {
        req.session.loggedIn = true;
        req.session.uId = userId;
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

};

module.exports = Session;