/*******************************
 * [api.js]
 * API entry-point, intialisation of endpoints happens here
 *
 ******************************/

const walk = require( "walk" );
const path = require( "path" );

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

    getEndpoints( dir, callback ) {
        const { logger } = this.dependencies;

        const walker = walk.walk( dir, { followLinks : false } );
        const endpoints = [];
        const actions = [];
        let result = [];

        logger.log( "info", `Discovering endpoints in ${dir}...` );

        walker.on( "directories", function( subDir, stat, next ) {
            const subDirectory = walk.walk( subDir, { followLinks : false } );

            logger.log( "info", `Found directory: ${subDir}` );

            subDirectory.on( "file", function( root, stat, next ) {
                logger.log( "info", `Found file ${root}/${stat.name}` );

                if ( stat.name.includes( "_endpoint.js" ) ) {
                    logger.log( "info", "Valid endpoint, registering." );
                    endpoints.push( {
                        location : root + "/" + stat.name,
                        filename : stat.name
                    } );
                }

                if ( stat.name.includes( "_action.js" ) ) {
                    logger.log( "info", "Valid endpoint action, registering." );
                    actions.push( {
                        location : root + "/" + stat.name,
                        filename : stat.name
                    } );
                }

                next();
            } );

            subDirectory.on( "end", next );
        } );

        walker.on( "end", _ => {
            logger.log( "info", `Done! I found ${endpoints.length} endpoints and ${actions.length} actions` );
            result = endpoints.map( endpoint => {
                const endpointName = endpoint.filename.replace( "_endpoint.js", "" );
                const action = actions.find( action => action.filename.includes( endpointName ) );

                return {
                    entry : endpoint.location,
                    action : action.location
                };
            } );

            callback( result );
        } );
    }

    registerEndpoints() {
        const { logger } = this.dependencies;

        const currentDirectory = path.resolve( __dirname );
        const endpointsDirectory = currentDirectory + "/endpoints";

        logger.log( "info", "Registering endpoints..." );

        this.getEndpoints( endpointsDirectory, results => {
            for ( const result of results ) {
                const { entry, action } = result;

                const endpoint = new ( require( entry ) )(
                    {
                        ...this.dependencies,
                        action : require( action )
                    },
                    this.config
                );
                endpoint.register();
            }
        } );
    }
}

module.exports = API;
