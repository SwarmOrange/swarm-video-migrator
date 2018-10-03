class Worker {
    constructor( dependencies ) {
        this.dependencies = dependencies;
        this.request = this.request.bind( this );
    }

    request( processType, parameters, callback ) {
        const { binaries, spawn } = this.dependencies;
        const { ytDl } = binaries.paths;

        const process = spawn( ytDl, this.getJob( parameters ) );

        switch ( processType ) {
        case "info":
            return this.output( process, callback );
        case "file":
            return this.download( process );

        default:
            throw new Error( "unknown output!" );
        }
    }

    getJob( parameters ) {
        const { output, url, quality, outputLocation, type } = parameters;
        const { logger, jobs, jobConfigs } = this.dependencies;

        logger.log( "info", `Starting job ${output}` );

        return jobs[output]( {
            ...jobConfigs,
            url,
            quality,
            outputLocation
        } );
    }

    output( process, callback ) {
        const { logger } = this.dependencies;

        process.stdout.setEncoding( "UTF-8" );
        process.stderr.setEncoding( "UTF-8" );

        let result = "";
        process.stdout.on( "data", data => ( result += data ) );

        let err = "";
        process.stderr.on( "data", data => ( err += data ) );

        process.on( "close", () => {
            if ( err ) {
                logger.log( "info", "Output has encountered an error." );
                return callback( err );
            }

            logger.log( "info", "Output done." );
            return callback( null, result.trim() );
        } );
    }

    download( process ) {
        const { byline, state, progress, events, logger } = this.dependencies;

        process.stdout.setEncoding( "UTF-8" );
        process.stderr.setEncoding( "UTF-8" );

        const eventEmitter = new events.EventEmitter();
        let currentState = state.NONE;

        byline( process.stdout ).on( "data", data => {
            if ( state.isValid( data ) ) {
                let newState = state.getState( data );
                if ( currentState !== newState ) {
                    currentState = newState;
                    eventEmitter.emit( "state", newState );
                }
            }
            if ( progress.isValid( data ) ) {
                let newProgress = progress.getProgress( data );
                eventEmitter.emit( "progress", newProgress );
            }
        } );

        let err = "";
        byline( process.stderr ).on( "data", data => {
            if ( !this.isWarning( data ) ) {
                err += data;
            }
        } );

        process.on( "close", () => {
            if ( err ) {
                eventEmitter.emit( "error", err );
                return;
            }

            eventEmitter.emit( "state", state.states.URL_PROCESSED );
            eventEmitter.emit( "url_processed" );

            // Timeout is just to simulate that the system would normally take a bit of time to complete these tasks.
            setTimeout( () => {
                eventEmitter.emit( "state", state.states.UPLOADED );
                eventEmitter.emit( "uploaded" );
            }, 1000 );

            logger.log( "info", "File done." );
        } );

        return eventEmitter;
    }

    isWarning( err ) {
        return err.lastIndexOf( "WARNING:", 0 ) === 0;
    }
}

module.exports = Worker;
