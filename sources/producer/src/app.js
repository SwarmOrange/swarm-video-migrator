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
        this.api;
    }

    init() {
        global.app = {};
        global.app.rootDir = path.resolve( __dirname );

        this.services = services.init( this.config );
        this.api = new ( require( "./services/api.js" ) )( this.services, this.config );
    }
}

module.exports = Application;
