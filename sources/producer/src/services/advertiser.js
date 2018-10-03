/*******************************
 * [advertiser.js]
 * Sends orders to the db and work queue
 *
 ******************************/
class Advertiser {
    constructor( dependencies, parameters ) {
        this.dependencies = dependencies;
        this.parameters = parameters;
    }

    advertise( order, callback ) {
        const { uuid, status } = order;
        const { redis, sqlite, schemas, logger } = this.dependencies;

        logger.log( "info", "Checking if we can advertise this order." );
        redis.workQueueIsHealthy( 1, ( err, isHealthy ) => {
            if ( isHealthy ) {
                // Now also save it to the work queue
                logger.log( "info", "Queue is healthy!" );
                redis.saveOrder( uuid, ( err, id ) => {
                    if ( err ) {
                        logger.log( "exception", `Failed to save order ${uuid} to the redis queue:` );
                        logger.log( "default", err );
                    } else {
                        logger.log( "info", `Saved order ${uuid} to redis as ${id}` );
                    }

                    const updates = [{ key : "status", value : "accepted" }, { key : "advertised_at", value : Date.now() }];
                    const statuses = schemas.orderTable.rows.find( column => column.identifier == "status" ).allowedValues;

                    for ( const status of statuses ) {
                        if ( ["accepted", "advertised"].includes( status ) ) continue;

                        updates.push( { key : `${status}_at`, value : null } );
                    }

                    sqlite.updateOrder( uuid, updates, ( err, result ) => {
                        if ( err ) {
                            throw Error( err );
                            return;
                        }

                        logger.log( "info", "Updated order" );
                        callback( err, {
                            status,
                            uuid
                        } );
                    } );
                } );
            } else {
                // If queue is full, we can push it later
                logger.log( "info", "Queue not healthy enough." );
                callback( err || new Error( "Order not queued for work yet due to insufficient capacity. Please query for an update later." ), {
                    status,
                    uuid
                } );
            }
        } );
    }
}

module.exports = Advertiser;
