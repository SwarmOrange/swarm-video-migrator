class binaries {
    constructor( dependencies ) {
        this.paths = dependencies.paths;
        this.spawn = dependencies.spawn;
    }

    isValid() {
        let processes = [this.spawn( this.paths.youtubeDl, ["--version"] ), this.spawn( this.paths.ffmpeg, ["-version"] ), this.spawn( this.paths.ffprobe, ["-version"] )];
        let promises = processes.map(
            process =>
                new Promise( ( resolve, reject ) => {
                    process.on( "close", exitCode => {
                        if ( exitCode !== 0 ) {
                            reject( "Failed with exit value of " + exitCode );
                        }
                        resolve();
                    } );
                } )
        );
        return Promise.all( promises );
    }
}

module.exports = binaries;
