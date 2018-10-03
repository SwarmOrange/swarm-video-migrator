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
            const updates = [{ key : "status", value : "pulled" }, { key : "pulled_at", value : Date.now() }];

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
                    let order = results[0];
                    const { type } = order;

                    // channel & playlist requests should print a list of urls, to be made into new orders with settings based on the original
                    if ( ["channel", "playlist"].includes( type ) ) {
                        order.output = "id";
                    }

                    callback( err, order );
                } );
            } );
        } );
    }
}

module.exports = Action;
