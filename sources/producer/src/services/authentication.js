/*******************************
 * [authentication.js]
 * Authentication service
 *
 ******************************/

class AuthenticationService {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
    }

    getUserFromAuthHeader( req ) {
        const { basicAuth } = this.dependencies;

        return basicAuth( req );
    }

    basic( req, res, next ) {
        const { logger } = this.dependencies;
        const { AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD } = this.config;

        const user = this.getUserFromAuthHeader( req );

        const correctUser = AUTH_BASIC_USERNAME;
        const correctPw = AUTH_BASIC_PASSWORD;

        if ( user && user.name == correctUser && user.pass == correctPw ) {
            next();
        } else {
            logger.log( "warning", user ? "Client rejected, incorrect credentials" : "Client rejected, no credentials provided" );
            res.set( { "WWW-Authenticate" : "Basic realm=\"simple-admin\"" } );
            res.send( 401, user ? "Incorrect credentials" : "Need credentials" );
        }
    }
}

module.exports = AuthenticationService;
