/*******************************
 * [post_order_endpoint.js]
 * Endpoint entry
 *
 ******************************/

class Endpoint {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
    }

    register() {
        const { authentication, express, Job, logger, action } = this.dependencies;
        const address = "/api/order";

        logger.log( "info", `Registering endpoint ${address}` );

        express.use( address, function( req, res, next ) {
            authentication.basic( req, res, next );
        } );

        express.post( address, ( req, res ) => {
            const { url, swarm_hash, output, quality } = req.body;

            logger.log( "info", "Order for has been received:" );
            logger.log( "default", req.body );

            const parameters = {
                verifications : {
                    shouldRecordToRedis : true,
                    mandatoryParameters : [{ url }, { swarm_hash }, { url }]
                },
                url,
                swarm_hash,
                output,
                quality
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
