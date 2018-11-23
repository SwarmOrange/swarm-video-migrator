class Worker {
    constructor( dependencies, parameters, config ) {
        this.dependencies = dependencies;
        this.request = this.request.bind( this );
        this.parameters = parameters;
        this.config = config;
        //this.workingHash;
    }

    request( processType, parameters, callback ) {
        const { binaries, spawn, events } = this.dependencies;
        const { ytDl } = binaries.paths;
        this.parameters = parameters;
        this.dependencies = {
            ...this.dependencies,
            eventEmitter : new events.EventEmitter()
        };

        const process = spawn( ytDl, this.getJob() );

        switch ( processType ) {
        case "info":
            return this.output( process, callback );
        case "file":
            return this.download( process );

        default:
            throw new Error( "unknown output!" );
        }
    }

    getJob() {
        const { output, url, quality, fileOutputLocation, type } = this.parameters;
        const { logger, jobs, jobConfigs } = this.dependencies;

        logger.log( "info", `Starting job ${output}` );

        return jobs[output]( {
            ...jobConfigs,
            url,
            quality,
            fileOutputLocation,
            type
        } );
    }

    shouldIgnoreError( err ) {
        const { type } = this.parameters;
        const safeErrors = [ "This video is unavailable" ];
        const orderIsChain = [ "channel", "playlist" ].includes( type );

        if ( orderIsChain && safeErrors.includes( err.message ) ) return true;
        else return false;
    }

    output( process, callback ) {
        const { logger } = this.dependencies;
        let result = "";
        let err = "";

        logger.log( "info", "Process of type output has started" );

        process.stdout.setEncoding( "UTF-8" );
        process.stderr.setEncoding( "UTF-8" );

        process.stdout.on( "data", data => {
            logger.log( "info", "onData - stdout" );
            logger.log( "default", data );

            result += data;
        } );

        process.stderr.on( "data", data => {
            logger.log( "info", "onData - Err" );
            logger.log( "default", data );

            err += data;
        } );

        process.on( "close", () => {
            const cleanResult = result.trim();
            const resultIsEmpty = result.length == 0;

            //@TODO: How to handle this for channel errors? Does it stack up with all the videos that it skips?
            //Or do those not write to error?
            if ( err && !this.shouldIgnoreError( err ) ) {
                logger.log( "info", "Output has encountered an error. Cannot complete properly." );
                logger.persist( "error", err );

                return callback( err );
            } else if ( err ) {
                logger.log( "warning", "Had error, but ignoring:" );
                logger.log( "default", err );
                logger.persist( "default", err );
            }

            logger.log( "info", "Output done." );

            return callback( resultIsEmpty ? new Error( "Empty result" ) : null, cleanResult );
        } );
    }

    download( process ) {
        const { outputDir, parentFolder } = this.parameters;
        const { byline, state, progress, logger, io, eventEmitter } = this.dependencies;
        let currentState = state.NONE;

        logger.log( "info", "Process of type download has started" );

        process.stdout.setEncoding( "UTF-8" );
        process.stderr.setEncoding( "UTF-8" );

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
                logger.persist( "error", err );
                return;
            }

            eventEmitter.emit( "state", state.states.URL_PROCESSED );
            eventEmitter.emit( "url_processed" );

            this.upload( ( errors, successes ) => {
                logger.log( "success", "Uploads done!" );

                if ( errors.length > 0 ) {
                    logger.log( "warning", "There was an issue during uploading!" );
                    eventEmitter.emit( "error", "UPLOAD_ERROR" );
                    return;
                }
                this.finish( successes );
            } );
        } );

        return eventEmitter;
    }

    // @TODO: move to utilities
    // https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
    to( promise ) {
        return promise
            .then( data => {
                return [ null, data ];
            } )
            .catch( err => [ err ] );
    }

    async finish( err, result ) {
        const { state, logger, eventEmitter } = this.dependencies;

        eventEmitter.emit( "state", state.states.UPLOADED );
        eventEmitter.emit( "uploaded", err, result );

        logger.log( "info", "Worker is done." );
    }

    // @TODO: Could use some refacto & splitting
    upload( callback ) {
        const { outputDir, upload_to } = this.parameters;
        const { logger } = this.dependencies;

        const errors = [];
        const successes = [];
        const self = this;

        this.listFiles( outputDir, async files => {
            if ( upload_to == "beefree" ) {
                return this.uploadToBeeFree( files );
            } else {
                for ( const file of files ) {
                    await ( async function( file ) {
                        switch ( upload_to ) {
                        case "s3":
                            return self
                                .uploadToS3( file )
                                .then( result => {
                                    const { error, success } = result;

                                    if ( error ) errors.push( error );
                                    else if ( success ) successes.push( success );
                                } )
                                .catch( err => {
                                    logger.log( "exception", "Caught upload promise exception", err );
                                    errors.push( file );
                                } );
                            break;

                        default:
                            logger.log( "exception", "Unknown upload location!" );
                            errors.push( file );
                            break;
                        }
                    } )( file );
                }

                callback( errors, successes );
            }
        } );
    }

    listFiles( dir, callback ) {
        const { walk, logger } = this.dependencies;
        const walker = walk.walk( dir, { followLinks : false } );
        let files = [];

        logger.log( "info", `\nDiscovering files in ${dir}...` );

        walker.on( "file", ( root, stat, next ) => {
            const filePath = root + "/" + stat.name;
            const fileName = stat.name;
            let extension;
            let fileNameNoExtension = stat.name.split( "." );
            const fileExtension = fileNameNoExtension.pop();
            fileNameNoExtension = fileNameNoExtension.join( "_" );

            logger.log( "info", `Found ${root}/${stat.name}` );
            files.push( {
                filePath,
                fileName,
                fileExtension,
                fileNameNoExtension
            } );
            next();
        } );

        walker.on( "end", _ => {
            logger.log( "info", `Done! I found ${files.length} files` );
            callback( files );
        } );
    }

    parseFiles( files, callback ) {
        const { logger, io, FileAPI } = this.dependencies;
        const parsedFiles = [];

        for ( const file of files ) {
            const { filePath, fileName, fileNameNoExtension, fileExtension } = file;
            let cleanName = fileNameNoExtension.split( "_" );
            cleanName.pop();
            cleanName = cleanName.join( "_" );

            io.loadFile( filePath, ( data, fileType ) => {
                const fileToUpload = {
                    name : `${cleanName.split( " " ).join( "_" )}.${fileExtension}`,
                    type : fileType,
                    data : data,
                    cleanName : cleanName
                };

                parsedFiles.push( fileToUpload );

                const allFilesParsed = parsedFiles.length == files.length;
                if ( allFilesParsed ) {
                    //console.log( parsedFiles );

                    callback( parsedFiles );
                }
            } );
        }
    }

    uploadToBeeFree( files ) {
        const { BEE_FREE_URL } = this.config;
        const { SwarmApi, Blog, logger, eventEmitter } = this.dependencies;

        return this.parseFiles( files, parsedFiles => {
            const imageFile = parsedFiles.find( file => file.type.includes( "image" ) );
            const videoFile = parsedFiles.find( file => file.type.includes( "video" ) );
            const videoDescription = parsedFiles.find( file => file.name.includes( "description" ) ).data.toString( "utf8" );
            let targetAlbumId;
            let chainedHash;

            //prettier-ignore
            this.prepareBeeFreeAlbum( imageFile.name )
                .then( result => {
                    const { hash, albumId } = result;
                    const swarm = new SwarmApi( BEE_FREE_URL, hash );
                    const blog = new Blog( swarm );
                    targetAlbumId = albumId;

                    return blog.uploadFileToVideoAlbumNodeJs( albumId, imageFile );
                } )
                .then( result => {
                    const hash = result.response;
                    const swarm = new SwarmApi( BEE_FREE_URL, hash );
                    const blog = new Blog( swarm );

                    return blog.uploadFileToVideoAlbumNodeJs( targetAlbumId, videoFile );
                } )
                .then( result => {
                    const hash = result.response;
                    const swarm = new SwarmApi( BEE_FREE_URL, hash );
                    const blog = new Blog( swarm );

                    chainedHash = hash;

                    return blog.generateVideoEntry(
                        targetAlbumId,
                        videoFile.cleanName,
                        videoDescription,
                        imageFile.name,
                        videoFile.name,
                        "video"
                    );
                } )
                .then( entry => {
                    const swarm = new SwarmApi( BEE_FREE_URL, chainedHash );
                    const blog = new Blog( swarm );

                    return blog.appendVideoEntry( targetAlbumId, entry );
                } )
                .then( result => {
                    const finalHash = result.response;

                    logger.log( "info", "Final hash:" );
                    logger.log( "info", finalHash );

                    this.finish( null, { hash : finalHash } );
                } )
                .catch( err => {
                    logger.log( "warning", "Encountered issue during video entry registration:" );
                    logger.log( "exception", err );

                    eventEmitter.emit( "error", "UPLOAD_ERROR" );
                } );
        } );
    }

    prepareBeeFreeAlbum( coverFile ) {
        const { album_id, outputDir, upload_to, swarm_hash } = this.parameters;

        if ( album_id ) {
            return new Promise( resolve => resolve( { hash : swarm_hash, albumId : album_id } ) );
        } else {
            return this.appendAlbumToBeeFree( swarm_hash, coverFile );
        }
    }

    // @TODO: Perhaps later to free-core
    appendAlbumToBeeFree( hash, coverFile ) {
        const { FileAPI, SwarmApi, logger, fs, mime, io, Blog } = this.dependencies;
        const { BEE_FREE_URL } = this.config;

        return new Promise( ( resolve, reject ) => {
            const swarm = new SwarmApi( BEE_FREE_URL, hash );
            let targetBlog = new Blog( swarm );
            let newAlbumId;

            targetBlog
                .getLatestAlbumId()
                .then( response => {
                    if ( !response ) throw new Error( "No response" );

                    const latestAlbumId = response.albumId;
                    const updatedHash = response.hash;
                    const id = latestAlbumId + 1;
                    const albumName = `imported_album_${Date.now()}`;
                    const albumDescription = `Album was imported at ${new Date( Date.now() )}`;

                    console.log( `Creating new album with id ${id}` );
                    newAlbumId = id;

                    if ( updatedHash ) {
                        targetBlog = new Blog( new SwarmApi( BEE_FREE_URL, updatedHash ) );
                    }

                    return targetBlog.createVideoAlbum( id, albumName, albumDescription, null, coverFile );
                } )
                .then( response => {
                    const { hash } = response;

                    //this.workingHash = hash;

                    resolve( {
                        hash : hash,
                        albumId : newAlbumId
                    } );
                } )
                .catch( err => {
                    console.log( "Error during upload" );
                    console.log( err );

                    reject( err );
                } );
        } );
    }

    uploadToSwarm( file ) {
        const { filePath, fileName } = file;
        const { swarm_hash, SWARM_URL } = this.parameters;
        const { SwarmApi, logger, io } = this.dependencies;

        const swarm = new SwarmApi( SWARM_URL, swarm_hash );

        logger.log( "info", "Attempting to upload to beefree" );

        return new Promise( ( resolve, reject ) => {
            io.loadFile( filePath, ( data, fileType ) => {
                swarm
                    .post( fileName, data, fileType, swarm_hash, null, null )
                    .then( response => {
                        const hash = response.data;
                        logger.log( "info", `Hash for uploaded file ${fileName}: ${hash}` );

                        resolve( {
                            error : null,
                            success : {
                                ...file,
                                uploaded_file_hash : hash
                            }
                        } );
                    } )
                    .catch( err => {
                        logger.log( "warning", "Error during upload" );
                        logger.log( "exception", err );
                        reject( err );
                    } );
            } );
        } );
    }

    uploadToS3( file ) {
        const { io, aws, fs, logger } = this.dependencies;
        const { filePath, fileName } = file;
        const { uuid, parent_uuid } = this.parameters;
        const { AUTH_UPLOAD_S3_KEY, AUTH_UPLOAD_S3_SECRET, AUTH_UPLOAD_S3_BUCKET } = this.config;
        const s3Folder = parent_uuid ? `${parent_uuid}/${uuid}/${fileName}` : `${uuid}/${fileName}`;

        logger.log( "info", "Attempting to upload to s3" );

        return new Promise( ( resolve, reject ) => {
            // Read in the file, store to S3
            io.loadFile( filePath, ( data, fileType ) => {
                const s3 = new aws.S3( { accessKeyId : AUTH_UPLOAD_S3_KEY, secretAccessKey : AUTH_UPLOAD_S3_SECRET } );
                const params = {
                    Bucket : AUTH_UPLOAD_S3_BUCKET,
                    Key : s3Folder,
                    Body : JSON.stringify( data, null, 2 ) //new Buffer( data, "binary" )
                };

                s3.upload( params, ( err, data ) => {
                    if ( err ) {
                        logger.log( "exception", err );
                        reject( err );
                        return;
                    }

                    logger.log( "info", `File uploaded successfully at ${data.Location}` );

                    resolve( {
                        error : err,
                        success : data
                    } );
                } );
            } );
        } );
    }

    isWarning( err ) {
        return err.lastIndexOf( "WARNING:", 0 ) === 0;
    }
}

module.exports = Worker;
