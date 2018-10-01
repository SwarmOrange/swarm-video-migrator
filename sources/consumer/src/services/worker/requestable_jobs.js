module.exports = {
    audio : parameters => {
        const { OUTPUT_VIDEO_FORMAT, OUTPUT_AUDIO_FORMAT, outputLocation, url, binaries } = parameters;

        //prettier-ignore
        return [
            "-o",
            outputLocation,
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
        const { OUTPUT_VIDEO_FORMAT, outputLocation, url, binaries, quality } = parameters;

        //prettier-ignore
        let config = [
            "-o",
            outputLocation,
            "--format",
            OUTPUT_VIDEO_FORMAT,

            "--merge-output-format",
            "mkv",

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

        if ( quality == "hd" ) config = config.concat( ["-f", "bestvideo+bestaudio"] );

        return config;

        /* Alternative parameters - crashes
        //prettier-ignore
        return [
            "-o",
            outputLocation,
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
            `${outputLocation}`,
            "--format",
            OUTPUT_VIDEO_FORMAT,
            "--no-part",
            "--no-playlist",
            url
        ];
        */
    },
    url : parameters => {
        const { url } = parameters;

        //prettier-ignore
        return [
            "--get-url",
            "--encoding",
            "UTF-8",
            "--no-part",
            "--no-playlist",
            url
        ];
    },
    id : parameters => {
        const { url } = parameters;

        //prettier-ignore
        return [
            "--get-id",
            "--encoding",
            "UTF-8",
            "--no-part",
            "--no-playlist",
            url
        ];
    },
    filename : parameters => {
        const { OUTPUT_FILENAME_FORMAT, OUTPUT_VIDEO_FORMAT, url } = parameters;

        //prettier-ignore
        return [
            "-o",
            OUTPUT_FILENAME_FORMAT,
            "--format",
            OUTPUT_VIDEO_FORMAT,
            "--get-filename",
            "--encoding",
            "UTF-8",
            "--no-part",
            "--no-playlist",
            url
        ];
    },
    title : parameters => {
        const { url } = parameters;

        //prettier-ignore
        return [
            "--get-title",
            "--encoding", "UTF-8",
            "--no-part",
            "--no-playlist",
            url
        ];
    },
    channel : parameters => {
        const { url, outputLocation, binaries } = parameters;

        return null;

        // to be done

        //prettier-ignore
        return [
            "-o",
            outputLocation,

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
