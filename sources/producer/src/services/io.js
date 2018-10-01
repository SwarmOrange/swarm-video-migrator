/*******************************
 * [io.js]
 * File system interaction
 *
 ******************************/

class IO {
    constructor( dependencies ) {
        this.dependencies = dependencies;
    }

    deleteFile( path ) {}

    moveFile( oldPath, newPath, callback ) {
        const { fs, logger } = this.dependencies;

        fs.copy( oldPath, newPath, err => {
            if ( err ) throw new Error( err );

            logger.log( "info", "File copied" );
            fs.remove( oldPath, err => {
                if ( err ) throw new Error( err );

                logger.log( "info", "Old file deleted" );
                callback();
            } );
        } );
    }
}

module.exports = IO;
