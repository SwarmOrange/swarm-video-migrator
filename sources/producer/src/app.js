/*******************************
 * [app.js]
 * Application entry point lives here
 *
 ******************************/
const services = require( "./services/service_container.js" );
const path = require( "path" );

class Application {
    constructor( config ) {
        this.config = config;
        this.services;
    }

    init() {
        //rootDir = path.resolve( __dirname );

        this.services = services.init( this.config );
        const api = new ( require( "./services/api.js" ) )( this.services, this.config );

        api.init();
    }
}

module.exports = Application;
