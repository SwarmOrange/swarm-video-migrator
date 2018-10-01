/*******************************
 * [post_status_endpoint.js]
 * Endpoint entry
 *
 ******************************/

class Endpoint {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
    }

    register() {
        const { authentication, express, Job, logger, action } = this.dependencies;
        const address = "/api/post/status";

        logger.log( "info", `Registering endpoint ${address}` );

        express.use( address, function( req, res, next ) {
            authentication.basic( req, res, next );
        } );

        express.post( address, ( req, res ) => {
            const { uuid, status, redis_id, result } = req.body;

            logger.log( "info", "Status update has been received:" );
            logger.log( "default", req.body );

            const parameters = {
                verifications : {
                    mandatoryParameters : [{ uuid, status }]
                },
                uuid,
                status,
                redis_id,
                result
            };

            const dependencies = {
                ...this.dependencies,
                req,
                res
            };

            new Job( parameters, dependencies ).initialise( new action( this.dependencies, parameters ), dependencies );
        } );
    }
}

module.exports = Endpoint;
