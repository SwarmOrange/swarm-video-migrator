/*******************************
 * [app.js]
 * Application entry point lives here
 *
 ******************************/
const services = require( "./services/service_container.js" );
const path = require( "path" );

class Application {
    constructor( config ) {
        this.config = config;
        this.services;
        this.api;
        this.launchProcess = this.launchProcess.bind( this );
        this.incrementLiveProcesses = this.incrementLiveProcesses.bind( this );
        this.decrementLiveProcesses = this.decrementLiveProcesses.bind( this );
        this.liveProcesses = 0;
    }

    init() {
        const { REQUEST_WORK_EVERY_N_MILLISECONDS } = this.config;

        global.app = {};
        global.app.rootDir = path.resolve( __dirname );

        this.services = services.init( this.config );

        //this.testFile();
        //this.testInfo();
        setInterval( this.launchProcess, REQUEST_WORK_EVERY_N_MILLISECONDS );
    }

    launchProcess() {
        const { MAX_WORK_PER_WORKER } = this.config;
        const { Process, logger } = this.services;

        if ( this.liveProcesses >= MAX_WORK_PER_WORKER ) {
            logger.log( "info", `I am at max capacity, ${this.liveProcesses}/${MAX_WORK_PER_WORKER} workers` );
            return;
        }

        logger.log( "info", "launching new worker process" );
        this.incrementLiveProcesses();

        new Process(
            {
                ...this.services,
                worker : new this.services.worker( this.services.workerDependencies )
            },
            this.config
        ).init( this );
    }

    incrementLiveProcesses() {
        ++this.liveProcesses;
    }

    decrementLiveProcesses() {
        --this.liveProcesses;
    }
}

module.exports = Application;
