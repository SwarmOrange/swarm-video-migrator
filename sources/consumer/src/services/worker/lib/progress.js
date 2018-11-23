class progress {
    constructor() {
        this.patterns = {
            PERCENTAGE_COMPLETE_PATTERN : /([0-9.]+)/,
            FILE_SIZE_PATTERN : /of.*?([A-z0-9].+?) /,
            DOWNLOAD_SPEED_PATTERN : /at.*?(([A-z0-9].+?)|(Unknown)) /,
            ETA_PATTERN : /ETA.*?(([0-9:]+)|(Unknown))/
        };
    }

    isValid( progress ) {
        const { PERCENTAGE_COMPLETE_PATTERN, FILE_SIZE_PATTERN, DOWNLOAD_SPEED_PATTERN, ETA_PATTERN } = this.patterns;

        //prettier-ignore
        return (
            PERCENTAGE_COMPLETE_PATTERN.test( progress )
            && FILE_SIZE_PATTERN.test( progress )
            && DOWNLOAD_SPEED_PATTERN.test( progress )
            && ETA_PATTERN.test( progress )
        );
    }

    getProgress( input ) {
        const { PERCENTAGE_COMPLETE_PATTERN, FILE_SIZE_PATTERN, DOWNLOAD_SPEED_PATTERN, ETA_PATTERN } = this.patterns;

        if ( !this.isValid( input ) ) {
            throw new Error( "Unable to parse: " + input );
        }

        return {
            percentageComplete : PERCENTAGE_COMPLETE_PATTERN.exec( input )[1],
            fileSize : FILE_SIZE_PATTERN.exec( input )[1],
            downloadSpeed : DOWNLOAD_SPEED_PATTERN.exec( input )[1],
            eta : ETA_PATTERN.exec( input )[1]
        };
    }
}

module.exports = progress;
