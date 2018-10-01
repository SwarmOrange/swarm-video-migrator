class Advertiser {
    constructor( dependencies, parameters ) {
        this.dependencies = dependencies;
        this.parameters = parameters;
    }

    advertise( order, callback ) {
        const { redis, sqlite, logger } = this.dependencies;

        sqlite.saveOrder( order, err => {
            if ( err ) {
                callback( err );
                return;
            }

            const { uuid, status } = order;

            redis.workQueueIsHealthy( ( err, isHealthy ) => {
                if ( isHealthy ) {
                    // Now also save it to the work queue
                    redis.saveOrder( uuid, ( err, id ) => {
                        if ( err ) {
                            logger.log( "exception", `Failed to save order ${uuid} to the redis queue:` );
                            logger.log( "default", err );
                        } else {
                            logger.log( "info", `Saved order ${uuid} to redis as ${id}` );
                        }

                        callback( err, {
                            status,
                            uuid,
                            message : !err ? "Order registered, and queued for work!" : `Order registered, but not queued because ${err.message}, we will handle this.`
                        } );
                    } );
                } else {
                    // If queue is full, we can push it later
                    callback( err, {
                        status,
                        uuid,
                        message : "Order registered, but not queued for work yet due to insufficient capacity. Please query for an update later."
                    } );
                }
            } );
        } );
    }
}

module.exports = Advertiser;
