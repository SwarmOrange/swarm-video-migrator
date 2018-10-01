/*******************************
 * [get_status_endpoint.js]
 * Endpoint entry
 *
 ******************************/

class Endpoint {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
    }

    register() {
        const { authentication, express, Job, logger, action } = this.dependencies;
        const address = "/api/get/status/:uuid";

        logger.log( "info", `Registering endpoint ${address}` );

        express.use( address, function( req, res, next ) {
            authentication.basic( req, res, next );
        } );

        express.get( address, ( req, res ) => {
            const { uuid } = req.params;

            logger.log( "info", "Order status request for has been received:" );
            logger.log( "default", req.params );

            const parameters = {
                verifications : {
                    shouldRecordToRedis : false,
                    mandatoryParameters : [{ uuid }]
                },
                uuid
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
