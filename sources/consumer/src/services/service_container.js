/*******************************
 * [service_container.js]
 * Unified service container used throughout the application
 *
 ******************************/
import aws from "aws-sdk";
import fs from "fs-extra";
import path from "path";
import request from "request";
import mmm from "mmmagic";
import rimraf from "rimraf";
import walk from "walk";
const Magic = mmm.Magic;

module.exports = {
    init : config => {
        const logger = new ( require( "./libs/logger.js" ) )( { fs } );
        const spawn = require( "child_process" ).spawn;
        const binaries = new ( require( "./worker/lib/binaries" ) )( {
            spawn,
            paths : {
                ytDl : require.resolve( "./worker/lib/vendor/youtube-dl" ),
                ffmpeg : require.resolve( "./worker/lib/vendor/ffmpeg" ),
                ffprobe : require.resolve( "./worker/lib/vendor/ffprobe" )
            }
        } );

        const jobs = require( "./worker/requestable_jobs.js" );
        const { OUTPUT_FILENAME_FORMAT, OUTPUT_VIDEO_FORMAT, OUTPUT_AUDIO_FORMAT, OUTPUT_DOWNLOAD_LOCATION } = config;
        const jobConfigs = {
            OUTPUT_FILENAME_FORMAT,
            OUTPUT_VIDEO_FORMAT,
            OUTPUT_AUDIO_FORMAT,
            OUTPUT_DOWNLOAD_LOCATION,
            binaries
        };

        const io = new ( require( "./libs/io.js" ) )( {
            logger,
            rimraf,
            magic : new Magic( mmm.MAGIC_MIME_TYPE ),
            fs
        } );

        const workerDependencies = {
            io,
            aws,
            fs,
            walk,
            logger,
            spawn,
            binaries,
            jobs,
            jobConfigs,
            SwarmApi : require( "./libs/free-core/js/SwarmApi.js" ),
            Blog : require( "./libs/free-core/js/Blog.js" ),
            events : require( "events" ),
            byline : require( "byline" ),
            progress : new ( require( "./worker/lib/progress" ) )(),
            state : new ( require( "./worker/lib/state" ) )()
        };

        const Worker = require( "./worker/worker.js" );

        const Process = require( "./process.js" );

        return {
            Process,
            io,
            logger,
            request,
            path,
            workerDependencies,
            Worker
        };
    }
};
