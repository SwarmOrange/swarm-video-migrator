class Process {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
        this.updateWorkStatus = this.updateWorkStatus.bind( this );
        this.order;
        this.result;
        this.onFinish;
    }

    init( callback ) {
        this.onFinish = callback;
        this.pullWork();
    }

    pullWork() {
        const { worker, request, logger } = this.dependencies;
        const { PRODUCER_IP, PRODUCER_PORT, AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD } = this.config;
        const endpoint = `${PRODUCER_IP}:${PRODUCER_PORT}/api/order/pop`;

        logger.log( "info", "Requesting work" );

        request( endpoint, ( err, response, body ) => {
            logger.log( "info", `Server responded with status ${response && response.statusCode}:` );
            logger.log( "info", body );

            if ( err || !response ) {
                logger.log( "exception", err || "No response" );
                this.closeProcess();
                return;
            }

            if ( response.statusCode == 200 ) {
                body = JSON.parse( body );

                logger.log( "info", "I found work!" );
                logger.log( "default", body );

                this.order = body;

                try {
                    this.performWork();
                } catch ( err ) {
                    logger.log( "exception", err );
                    this.closeProcess();
                }
            } else if ( response.statusCode == 204 ) {
                logger.log( "info", "No work for me!" );
                this.closeProcess();
            } else {
                this.closeProcess();
            }
        } ).auth( AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD );
    }

    performWork() {
        function getProcessTypeFromOutputType( output ) {
            const fileTypes = ["audio_video", "video", "audio", "title", "filename"];
            const infoTypes = ["url", "title", "filename", "id"];

            if ( fileTypes.includes( output ) ) return "file";
            if ( infoTypes.includes( output ) ) return "info";

            throw new Error( `Unknown output type ${output}!` );
        }

        const { OUTPUT_DOWNLOAD_LOCATION, OUTPUT_FILENAME_FORMAT } = this.config;
        const { output, uuid, parent_uuid } = this.order;
        const folder = parent_uuid ? parent_uuid : uuid;
        const processType = getProcessTypeFromOutputType( output );
        const outputLocation = `${OUTPUT_DOWNLOAD_LOCATION}/${folder}/${OUTPUT_FILENAME_FORMAT}`;

        if ( processType == "info" )
            this.queryInformation( { ...this.order, outputLocation }, ( err, result ) => {
                this.complete( err, result );
            } );
        if ( processType == "file" ) this.queryFile( { ...this.order, outputLocation } );
    }

    queryInformation( parameters, callback ) {
        const { worker, logger } = this.dependencies;

        try {
            worker.request( "info", { ...this.config, ...parameters }, ( err, result ) => {
                if ( err ) {
                    this.signalError( err );
                    return;
                }

                const arrayedResult = result.split( /\r?\n/ );

                logger.log( "success", "Result:" );
                logger.log( "default", result );
                callback( err, arrayedResult );
            } );
        } catch ( err ) {
            logger.log( "exception", err );
            this.signalError( err );
            //callback( err );
        }
    }

    queryFile( parameters ) {
        const { output } = parameters;
        const { worker, logger } = this.dependencies;

        try {
            if ( output == "audio_video" ) throw new Error( "Need to test this one. Can I serve separate video also?" );

            const query = worker.request( "file", { ...this.config, ...parameters } );

            query.on( "state", state => {
                this.reportStatusChange( state.text );
                logger.log( "info", state ? `Worker state changed to: ${state.text}` : "Worker changed to unknown state, did I encounter an issue?" );
            } );

            query.on( "progress", progress => logger.log( "default", progress ) );
            query.on( "error", error => {
                this.signalError( error );
                logger.log( "exception", `Worker encountered an error: ${error}` );
            } );
            query.on( "url_processed", error => logger.log( "info", "Worker has fully processed the url" ) );
            query.on( "uploaded", ( error, result ) => {
                this.complete( error, result );
                logger.log( "success", "Worker has uploaded the file" );
                logger.log( "succcess", "Worker finished" );
            } );
        } catch ( err ) {
            logger.log( "exception", err );
            this.signalError( err );
        }
    }

    reportStatusChange( status ) {
        if ( status == "URL_PROCESSED" ) this.updateWorkStatus( "processed" );
    }

    updateWorkStatus( status, result ) {
        const { PRODUCER_IP, PRODUCER_PORT, AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD } = this.config;
        const { request, logger } = this.dependencies;
        const { uuid } = this.order;
        const endpoint = `${PRODUCER_IP}:${PRODUCER_PORT}/api/order/status`;

        logger.log( "info", "Requesting status update server-side" );
        request
            .post( { url : endpoint, form : { uuid, status, result } }, ( err, response, body ) => {
                logger.log( "info", `Server responded with status ${response && response.statusCode}:` );
                logger.log( "info", body );
            } )
            .auth( AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD );
    }

    complete( err, result ) {
        // delete files on disk

        const { logger } = this.dependencies;
        this.closeProcess();
        this.updateWorkStatus( "completed", result );

        logger.log( "success", "Completely done!" );
    }

    closeProcess() {
        const { logger } = this.dependencies;
        logger.log( "info", "Closing process!" );

        this.onFinish();
    }

    signalError( error ) {
        this.updateWorkStatus( "errored", error );
        this.closeProcess();
    }
}

module.exports = Process;
