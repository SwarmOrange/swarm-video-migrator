/*******************************
 * [expressService.js]
 * Base layer for the API
 *
 ******************************/

class ExpressService {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
        this.app;
    }

    init() {
        const { bodyParser, logger, morgan, express, path, RedisStore } = this.dependencies;
        const { PRODUCER_PORT } = this.config;

        logger.log( "info", "Service Express initialising" );

        const app = express();
        app.disable( "x-powered-by" );
        //const { PORT = 4001 } = process.env;

        app.use(
            bodyParser.urlencoded( {
                extended : true,
                limit : "50mb"
            } )
        );

        app.use( express.static( path.join( __dirname, "../../public" ) ) );

        /* @TODO: This somehow blocks the other endpoints
            // Catch 404 and forward to error handler
            app.use( ( req, res, next ) => {
                const err = new Error( "Not Found" );
                err.status = 404;
                next( err );
            } );

            // Error handler
            app.use( ( err, req, res, next ) => {
                // eslint-disable-line no-unused-vars
                res.status( err.status || 500 ).render( "error", {
                    message : err.message
                } );
            } );

            app.use(
                morgan( "dev", {
                    skip : () => app.get( "env" ) === "test"
                } )
            );
        */

        app.use(
            bodyParser.json( {
                limit : "50mb"
            } )
        );

        // View engine setup
        app.set( "views", path.join( __dirname, "../views" ) );
        app.set( "view engine", "pug" );

        app.use( function( req, res, next ) {
            res.header( "Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT" );
            res.header( "Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization" );
            //res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
            res.header( "Access-Control-Allow-Origin", "*" );
            res.header( "Access-Control-Allow-Credentials", "true" );
            //res.header( "Access-Control-Request-Headers", "*" );
            //response.setHeader("Access-Control-Allow-Credentials", "true");
            //response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers")
            next();
        } );

        //app.use( express.static( path.join( __dirname, "../..", "public/" ) ) );

        app.listen( PRODUCER_PORT, err => {
            if ( err ) {
                throw err;
                return;
            }

            logger.log( "info", `Application is listening at ${PRODUCER_PORT}!` );
        } );

        return app;
    }
}

module.exports = ExpressService;
