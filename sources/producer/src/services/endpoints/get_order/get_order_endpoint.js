/*******************************
 * [get_order_endpoint.js]
 * Endpoint entry
 *
 ******************************/

class Endpoint {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
    }

    register() {
        const { authentication, express, Job, logger, action } = this.dependencies;
        const address = "/api/get/order";

        logger.log( "info", `Registering endpoint ${address}` );

        express.use( address, function( req, res, next ) {
            authentication.basic( req, res, next );
        } );

        express.get( address, ( req, res ) => {
            logger.log( "info", "Order pulling request received:" );

            const parameters = {
                verifications : {
                    shouldRecordToRedis : false,
                    mandatoryParameters : []
                }
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
