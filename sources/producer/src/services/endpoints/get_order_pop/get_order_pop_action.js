/*******************************
 * [get_order_pop_action.js]
 * The actions that are to be run when the appropriate endpoint is called
 *
 ******************************/

class Action {
    constructor( dependencies, parameters ) {
        this.dependencies = dependencies;
        this.parameters = parameters;
        this.launch = this.launch.bind( this );
    }

    launch( job, callback ) {
        const { redis, sqlite } = this.dependencies;

        this.dependencies = {
            ...this.dependencies,
            job
        };

        redis.popOrder( ( err, response ) => {
            const { id, message } = response;
            const uuid = message;
            const updates = [ { key : "status", value : "pulled" }, { key : "pulled_at", value : Date.now() } ];

            if ( !id ) {
                callback( err, "No work available", 204 );
                return;
            }

            sqlite.updateOrder( uuid, updates, ( err, result ) => {
                if ( err ) {
                    job.error( err );
                    return;
                }

                // Add the entire work order for the consumer to have enough information to work
                sqlite.getOrders( "uuid", uuid, ( err, results ) => {
                    if ( err ) {
                        callback( err );
                        return;
                    }

                    let order = results[0];
                    const { type, parent_uuid } = order;

                    // channel & playlist requests should print a list of urls, to be made into new orders with settings based on the original
                    if ( [ "channel", "playlist" ].includes( type ) ) {
                        order.output = "id";
                    }

                    if ( parent_uuid ) {
                        this.updateHash( order, parent_uuid, callback );
                    } else {
                        callback( err, order );
                    }
                } );
            } );
        } );
    }

    // If we are pulling a child from a parent uuid (channel/playlist migration), we need to pass the latest hash
    updateHash( order, parent_uuid, callback ) {
        const { sqlite, logger } = this.dependencies;

        sqlite.getOrders( "uuid", parent_uuid, ( err, results ) => {
            if ( err ) {
                logger.log( "exception", "No matching orders found!" );
                return;
            }

            const { latest_hash } = results[0];

            callback( err, {
                ...order,
                swarm_hash : latest_hash || order.swarm_hash // in case this is the first child
            } );
        } );
    }
}

module.exports = Action;
