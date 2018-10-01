/*******************************
 * [post_status_action.js]
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
        this.dependencies = {
            ...this.dependencies,
            job
        };

        this.updateStatus( callback );
    }

    updateStatus( callback ) {
        const { status, uuid } = this.parameters;
        const { sqlite } = this.dependencies;
        const updates = [{ key : "status", value : status }, { key : `${status}_at`, value : Date.now() }];

        if ( status == "errored" ) this.handleErrorStatus( updates, callback );
        else if ( status == "completed" ) this.handleCompletionStatus( updates, callback );
        else {
            sqlite.updateOrder( uuid, updates, ( err, result ) => {
                callback( err, status );
            } );
        }
    }

    async handleCompletionStatus( updates, callback ) {
        const { result, status, uuid } = this.parameters;
        const { logger, sqlite, job, orderFactory, advertiser } = this.dependencies;
        sqlite.getOrder( uuid, async ( err, results ) => {
            if ( err ) {
                job.error( err );
                return;
            }
            const order = results[0];
            const { type } = order;

            if ( ["channel", "playlist"].includes( type ) ) {
                // When a channel order completes, I am returned the ids of the channel videos. I can then process these as separate orders.
                for ( const id of result ) {
                    let childOrder = orderFactory.produce( order );
                    order.parent_uuid = order.uuid;
                    order.url = "https://www.youtube.com/watch?v=" + id;

                    logger.log( "info", "Generated a child order from this completed order." );
                    logger.log( "default", order );

                    await ( async function( childOrder ) {
                        return new Promise( resolve => {
                            advertiser.advertise( childOrder, ( err, result ) => {
                                resolve();
                            } );
                        } );
                    } )( childOrder );
                }

                sqlite.updateOrder( uuid, updates, ( err, result ) => {
                    logger.log( "info", "Child orders saved, now updating original order." );
                    callback( err, status );
                } );
            } else {
                sqlite.updateOrder( uuid, updates, ( err, result ) => {
                    callback( err, status );
                } );
            }
        } );
    }
    handleErrorStatus( updates, callback ) {
        const { MAX_RETRIES_PER_ORDER, status, uuid } = this.parameters;
        const { sqlite, job } = this.dependencies;

        sqlite.getOrder( uuid, ( err, order ) => {
            if ( err ) {
                job.error( err );
                return;
            }

            const { error_count } = order[0];

            updates.push( { key : "error_count", value : error_count + 1 } );
            if ( error_count == MAX_RETRIES_PER_ORDER ) updates.push( { key : "cancelled_at", value : Date.now() } );

            sqlite.updateOrder( uuid, updates, ( err, result ) => {
                callback( err, status );
            } );
        } );
    }
}

module.exports = Action;

// handle error_count
// set to cancelled_at
