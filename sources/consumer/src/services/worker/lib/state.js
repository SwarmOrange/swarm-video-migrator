class state {
    constructor() {
        this.states = {
            NONE : { id : 0, text : "NONE" },
            RESOLVING : { id : 1, text : "RESOLVING" },
            DOWNLOADING : { id : 2, text : "DOWNLOADING" },
            CONVERTING : { id : 3, text : "CONVERTING" },
            URL_PROCESSED : { id : 4, text : "URL_PROCESSED" },
            UPLOADED : { id : 4, text : "UPLOADED" }
        };

        this.patterns = {
            RESOLVING_PATTERN : /^\[youtube]/,
            DOWNLOADING_PATTERN : /^\[download]/,
            CONVERTING_PATTERN : /^\[ffmpeg]/,
            VALID_STATE_MESSAGE : /^\[(youtube|download|ffmpeg)]/
        };
    }

    isValid( state ) {
        const { VALID_STATE_MESSAGE } = this.patterns;

        return VALID_STATE_MESSAGE.test( state );
    }

    getState( input ) {
        const { RESOLVING_PATTERN, DOWNLOADING_PATTERN, CONVERTING_PATTERN } = this.patterns;
        const { RESOLVING, DOWNLOADING, CONVERTING } = this.states;

        if ( RESOLVING_PATTERN.test( input ) ) {
            return RESOLVING;
        } else if ( DOWNLOADING_PATTERN.test( input ) ) {
            return DOWNLOADING;
        } else if ( CONVERTING_PATTERN.test( input ) ) {
            return CONVERTING;
        }

        throw new Error( "Unable to parse: " + input );
    }
}

module.exports = state;
