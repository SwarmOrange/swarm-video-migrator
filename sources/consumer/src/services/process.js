class Process {
    constructor( dependencies, config, callback ) {
        this.dependencies = dependencies;
        this.config = config;
        this.updateWorkStatus = this.updateWorkStatus.bind( this );
        this.order;
        this.result;
        this.worker;
        this.outputDir;
        this.onFinish = callback;
    }

    init() {
        this.pullWork();
    }

    pullWork() {
        const { request, logger } = this.dependencies;
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
                    this.parameteriseWork( ( processType, parameters ) => {
                        this.worker = this.requestWorker( parameters );

                        if ( processType == "info" ) {
                            this.queryInformation( parameters, ( err, result ) => {
                                this.complete( err, result );
                            } );
                        } else if ( processType == "file" ) {
                            this.queryFile( parameters );
                        }
                    } );
                } catch ( err ) {
                    logger.log( "exception", err );
                    this.closeProcess();
                }
            } else if ( response.statusCode == 204 ) {
                logger.log( "info", "No work for me!" );
                this.closeProcess();
            } else {
                logger.log( "warning", `Unexpected status code ${response.statusCode}` );
                this.closeProcess();
            }
        } ).auth( AUTH_BASIC_USERNAME, AUTH_BASIC_PASSWORD );
    }

    parameteriseWork( callback ) {
        function getProcessTypeFromOutputType( output ) {
            const fileTypes = [ "audio_video", "video", "audio", "title", "filename" ];
            const infoTypes = [ "url", "title", "filename", "id" ];

            if ( fileTypes.includes( output ) ) return "file";
            if ( infoTypes.includes( output ) ) return "info";

            throw new Error( `Unknown output type ${output}!` );
        }

        const { OUTPUT_DOWNLOAD_LOCATION, OUTPUT_FILENAME_FORMAT } = this.config;
        const { output, uuid, parent_uuid } = this.order;
        const processType = getProcessTypeFromOutputType( output );

        const parentFolder = parent_uuid ? `${OUTPUT_DOWNLOAD_LOCATION}/${parent_uuid}` : null;
        const folderName = uuid;

        const outputDir = parentFolder ? `${parentFolder}/${folderName}` : `${OUTPUT_DOWNLOAD_LOCATION}/${folderName}`;
        const fileOutputLocation = `${outputDir}/${OUTPUT_FILENAME_FORMAT}`;
        this.outputDir = outputDir;

        const parameters = { ...this.order, fileOutputLocation, outputDir, parentFolder };

        callback( processType, parameters );
    }

    requestWorker( parameters ) {
        const { Worker } = this.dependencies;

        return new Worker( this.dependencies.workerDependencies, parameters, this.config );
    }

    queryInformation( parameters, callback ) {
        const { logger } = this.dependencies;

        try {
            this.worker.request( "info", { ...this.config, ...parameters }, ( err, result ) => {
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
        const { logger } = this.dependencies;

        try {
            if ( output == "audio_video" ) throw new Error( "Need to test this one. Can I serve separate video also?" );

            const query = this.worker.request( "file", { ...this.config, ...parameters } );

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

    cleanUp( callback ) {
        const { output, uuid, parent_uuid } = this.order;
        const { logger, io } = this.dependencies;
        logger.log( "info", "Closing process!" );

        io.delete( this.outputDir, () => {
            callback();
        } );
    }

    closeProcess() {
        if ( this.order ) this.cleanUp( this.onFinish );
        else this.onFinish();
    }

    signalError( error ) {
        this.updateWorkStatus( "errored", error );
        this.closeProcess();
    }
}

module.exports = Process;
