/*******************************
 * [job.js]
 * Request handling boilerplate
 *
 ******************************/

class Job {
    constructor( parameters, dependencies ) {
        this.res = dependencies.res;
        this.req = dependencies.req;
        this.parameters = parameters;
        this.dependencies = dependencies;
        this.logger = dependencies.logger;
        this.respond = this.respond.bind( this );
    }

    initialise( action ) {
        this.request( () => {
            this.launch( action.launch, ( err, result, status ) => {
                if ( err ) {
                    this.error( err );
                    return;
                }

                if ( !result ) {
                    this.error( {
                        result : "NULL",
                        error : "NO_RESULT"
                    } );

                    return;
                }

                this.complete( this.respond, result, status, ( err, result ) => {
                    this.logger.log( "info", "Request done" );
                } );
            } );
        } );
    }

    request( callback ) {
        this.verify( ( err, verified ) => {
            if ( verified ) {
                callback();
            } else {
                this.error( new Error( `Request verification failed! ${err.join( ", " )}` ) );
            }
        } );
    }

    verify( callback ) {
        const { logger } = this.dependencies;
        const { verifications } = this.parameters;
        let checks = [];
        let results = [];

        if ( verifications.mandatoryParameters.length > 0 ) {
            checks.push( {
                name : "Payload verification",
                execute : this.verifyParameters.bind( this ),
                parameters : this.parameters
            } );
        }

        // Better not to do this check here, it would block the request.
        // I could just store it in redis later when I have capacity
        /*
        if ( verifications.shouldRecordToRedis ) {
            checks.push( {
                name : "Redis health verification",
                execute : this.verifyRedisHealth.bind( this ),
                parameters : null
            } );
        }
        */

        if ( checks.length > 0 ) {
            for ( const check of checks ) {
                const { name } = check;

                logger.log( "info", `Running check ${name}` );
                check.execute( check.parameters, ( err, result ) => {
                    results.push( {
                        name,
                        err,
                        result
                    } );

                    if ( results.length == checks.length ) {
                        const errors = results.filter( check => !check.result ).map( result => {
                            const verficationName = result.name;
                            let errors = "null";

                            if ( result.err ) {
                                if ( Array.isArray( result.err ) ) {
                                    errors = result.err.join( ", " );
                                } else {
                                    if ( err.message ) errors = err.message;
                                    else errors = err;
                                }
                            }

                            return `${verficationName}: ${errors}`;
                        } );
                        const success = errors.length == 0 && result;

                        callback( errors, success );
                    }
                } );
            }
        } else {
            callback( null, true );
        }
    }

    verifyParameters( parameters, callback ) {
        const { mandatoryParameters } = parameters.verifications;
        const errors = [];

        const success = mandatoryParameters.every( parameter => {
            const variable = Object.keys( parameter )[0];
            const value = Object.values( parameter )[0];
            let variableIsValid = true;

            if ( value == undefined ) {
                errors.push( `undefined ${variable}` );
                return false;
            }

            if ( typeof variable == "string" ) {
                variableIsValid = value.length != 0;
            }

            if ( !variableIsValid ) errors.push( `INVALID ${variable}` );
            return variableIsValid;
        } );

        this.logger.log( "info", `Verification of parameters, OK: ${success}` );

        callback( errors, success );
    }

    verifyRedisHealth( parameters, callback ) {
        const { redis } = this.dependencies;
        redis.workQueueIsHealthy( 1, callback );
    }

    launch( action, callback ) {
        this.logger.log( "info", "Launching job..." );

        try {
            action( this, callback );
        } catch ( e ) {
            this.logger.log( "warning", "Issue found during operation!" );
            this.error( e );
        }
    }

    complete( action, result, status, callback ) {
        this.logger.log( "info", "Completing job with result:" );
        this.logger.log( "default", result );

        try {
            action( status || 200, result, callback );
        } catch ( e ) {
            this.logger.log( "warning", "Issue found during completion!" );
            this.error( e );
        } finally {
        }
    }

    respond( status, message ) {
        this.res.status( status ).send( message );
    }

    error( err ) {
        this.logger.log( "exception", "Job failed", err );
        this.res.status( 500 ).send( err.message ? err.message : err );
    }
}

module.exports = Job;
