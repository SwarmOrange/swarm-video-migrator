/*******************************
 * [api.js]
 * API entry-point, intialisation of endpoints happens here
 *
 ******************************/

class API {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
        this.services;
        this.init();
    }

    init() {
        const { logger } = this.dependencies;

        logger.log( "info", "Service API initialising" );
        this.registerEndpoints();
    }

    registerEndpoints() {
        const { logger, endpoints } = this.dependencies;

        logger.log( "info", "Registering endpoints..." );

        for ( const entry of endpoints ) {
            const { address, action } = entry;

            const endpoint = new address(
                {
                    ...this.dependencies,
                    action
                },
                this.config
            );
            endpoint.register();
        }
    }
}

module.exports = API;
