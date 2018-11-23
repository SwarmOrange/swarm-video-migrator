module.exports = {
    audio : parameters => {
        const { OUTPUT_VIDEO_FORMAT, OUTPUT_AUDIO_FORMAT, fileOutputLocation, url, binaries } = parameters;

        //prettier-ignore
        return [
            "-o",
            fileOutputLocation,
            "--format",
            OUTPUT_VIDEO_FORMAT,
            "--no-part",
            "--no-playlist",
            "--extract-audio",
            "--audio-format",
            OUTPUT_AUDIO_FORMAT,
            "--ffmpeg-location",
            binaries.paths.ffmpeg,
            url
        ];
    },
    video : parameters => {
        const { OUTPUT_VIDEO_FORMAT, fileOutputLocation, url, binaries, quality } = parameters;

        //prettier-ignore
        let config = [
            "-o",
            fileOutputLocation,
            "--format",
            OUTPUT_VIDEO_FORMAT,

            "--merge-output-format",
            OUTPUT_VIDEO_FORMAT,
            //"mkv",

            "--write-sub",
            "--all-subs",

            "--convert-subs",
            "srt",

            // Get metadata
            "--add-metadata",
            "--write-description",
            "--write-thumbnail",

            "--no-part",
            "--no-playlist",
            "--ffmpeg-location",
            binaries.paths.ffmpeg,
            url
        ];

        if ( quality == "hd" ) config = config.concat( [ "-f", "bestvideo+bestaudio" ] );

        return config;

        /* Alternative parameters - crashes
        //prettier-ignore
        return [
            "-o",
            fileOutputLocation,
            //Uniform Format
            "--prefer-ffmpeg",
            "--merge-output-format",
            "mkv",

            "--no-playlist",

            "--write-sub",
            "--all-subs",
            "--convert-subs",
            "srt",

            // Get metadata
            "--add-metadata",
            "--write-description",
            "--write-thumbnail",
            "--ffmpeg-location",
            binaries.paths.ffmpeg,

            "-v",
            url
        ];
        */

        /* Alternative parameters - simple - ok
        //prettier-ignore
        return [
            "-o",
            `${fileOutputLocation}`,
            "--format",
            OUTPUT_VIDEO_FORMAT,
            "--no-part",
            "--no-playlist",
            url
        ];
        */
    },
    url : parameters => {
        const { type, url } = parameters;

        //prettier-ignore
        const config = [
            "--get-url",
            "--encoding",
            "UTF-8",
            "--ignore-errors",
            "--no-part",
            "--no-playlist",
            url
        ];

        if ( type == "channel" ) config.unshift( "-i" );

        return config;
    },
    id : parameters => {
        const { type, url } = parameters;

        //prettier-ignore
        const config = [
            "--get-id",
            "--encoding",
            "UTF-8",
            "--ignore-errors",
            "--no-part",
            "--no-playlist",
            url
        ];

        if ( type == "channel" ) config.unshift( "-i" );

        return config;
    },
    filename : parameters => {
        const { type, OUTPUT_FILENAME_FORMAT, OUTPUT_VIDEO_FORMAT, url } = parameters;

        //prettier-ignore
        const config = [
            "-o",
            OUTPUT_FILENAME_FORMAT,
            "--format",
            OUTPUT_VIDEO_FORMAT,
            "--get-filename",
            "--encoding",
            "UTF-8",
            "--ignore-errors",
            "--no-part",
            "--no-playlist",
            url
        ];

        if ( type == "channel" ) config.unshift( "-i" );

        return config;
    },
    title : parameters => {
        const { type, url } = parameters;

        //prettier-ignore
        const config = [
            "--get-title",
            "--encoding",
            "UTF-8",
            "--ignore-errors",
            "--no-part",
            "--no-playlist",
            url
        ];

        if ( type == "channel" ) config.unshift( "-i" );

        return config;
    },
    channel : parameters => {
        const { url, fileOutputLocation, binaries } = parameters;

        return null;

        // to be done

        //prettier-ignore
        return [
            "-o",
            fileOutputLocation,

            // Archive Settings
            //"--download-archive youtube-dl-archive.txt",
            //"-a youtube-dl-channels.txt",

            //Uniform Format
            "--prefer-ffmpeg",
            "--merge-output-format",
            "mkv",

            // Get All Subs to SRT
            "--write-sub",
            "--all-subs",
            "--convert-subs",
            "srt",

            // Get metadata
            "--add-metadata",
            "--write-description",
            "--write-thumbnail",
            "--ffmpeg-location",
            binaries.paths.ffmpeg,

            "-v",
            url
        ];
    }
};
