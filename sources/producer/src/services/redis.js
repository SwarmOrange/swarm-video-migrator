/*******************************
 * [redis.js]
 * Redis manager
 *
 ******************************/

class Redis {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
    }

    init( callback ) {
        const { rsmq, logger } = this.dependencies;
        const { REDIS_WORK_QUEUE } = this.config;

        logger.log( "info", "Service redis initialising" );

        //this.deleteQueue( REDIS_WORK_QUEUE );

        rsmq.listQueues( ( err, queues ) => {
            if ( err ) {
                console.error( err );
                return;
            }

            logger.log( "info", "Active REDIS queues: " + queues.map( q => `'${q}'` ).join( "," ) );

            if ( !queues.includes( REDIS_WORK_QUEUE ) ) {
                logger.log( "info", "No active work queue, creating..." );

                rsmq.createQueue( { qname : REDIS_WORK_QUEUE }, ( err, resp ) => {
                    if ( resp === 1 ) {
                        console.log( `Queue ${REDIS_WORK_QUEUE} created` );
                    } else {
                        throw err;
                    }
                } );
            }
        } );
    }

    deleteQueue( queue, callback ) {
        const { rsmq } = this.dependencies;

        rsmq.deleteQueue( { qname : queue }, ( err, resp ) => {} );
    }

    popOrder( callback ) {
        const { rsmq } = this.dependencies;
        const { REDIS_WORK_QUEUE } = this.config;

        rsmq.popMessage( { qname : REDIS_WORK_QUEUE }, ( err, resp ) => {
            callback( err, resp );
        } );
    }

    removeOrder( id, callback ) {
        const { rsmq } = this.dependencies;
        const { REDIS_WORK_QUEUE } = this.config;

        rsmq.deleteMessage( { qname : REDIS_WORK_QUEUE, id }, ( err, resp ) => {
            callback( err, resp );
        } );
    }

    getOrder( callback ) {
        const { rsmq } = this.dependencies;
        const { REDIS_WORK_QUEUE } = this.config;

        rsmq.receiveMessage( { qname : REDIS_WORK_QUEUE }, ( err, resp ) => {
            callback( err, resp );
        } );
    }

    saveOrder( message, callback ) {
        const { rsmq, gger } = this.dependencies;
        const { REDIS_WORK_QUEUE } = this.config;

        rsmq.sendMessage( { qname : REDIS_WORK_QUEUE, message }, ( err, resp ) => {
            callback( err, resp );
        } );
    }

    workQueueIsHealthy( newOrders, callback ) {
        const { rsmq, logger } = this.dependencies;
        const { REDIS_WORK_QUEUE, REDIS_MAX_WORK_ORDERS } = this.config;

        logger.log( "info", "Checking redis health" );
        rsmq.getQueueAttributes( { qname : REDIS_WORK_QUEUE }, ( err, resp ) => {
            const issues = [];

            if ( err ) {
                callback( err.message );
            }

            const { msgs } = resp;

            const isHealthy = msgs + newOrders < REDIS_MAX_WORK_ORDERS;
            if ( !isHealthy ) issues.push( "Overloaded, please try again later." );

            logger.log( "info", isHealthy ? "Redis queue is healthy" : "Redis is overloaded!" );

            callback( issues, isHealthy );
        } );
    }
}

module.exports = Redis;
