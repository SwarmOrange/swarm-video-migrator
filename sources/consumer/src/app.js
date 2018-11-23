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
        this.finishProcess = this.finishProcess.bind( this );
        this.incrementLiveProcesses = this.incrementLiveProcesses.bind( this );
        this.decrementLiveProcesses = this.decrementLiveProcesses.bind( this );
        this.liveProcesses = 0;
    }

    init() {
        const { REQUEST_WORK_EVERY_N_MILLISECONDS } = this.config;

        this.services = services.init( this.config );
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

        new Process( this.services, this.config, this.finishProcess ).init();
    }

    finishProcess() {
        this.decrementLiveProcesses();
    }

    incrementLiveProcesses() {
        ++this.liveProcesses;
    }

    decrementLiveProcesses() {
        --this.liveProcesses;
    }
}

module.exports = Application;
