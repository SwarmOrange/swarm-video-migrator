/*******************************
 * [post_order_status_action.js]
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

        this.planUpdate( callback );
    }

    planUpdate( callback ) {
        const { status, uuid } = this.parameters;
        const { sqlite } = this.dependencies;
        let updates = [];

        if ( status == "completed" ) this.handleCompletionStatus( callback );
        else if ( status == "errored" ) this.handleErrorStatus( callback );
        else {
            updates.push( { key : "status", value : status } );
            updates.push( { key : `${status}_at`, value : Date.now() } );

            this.performUpdate( uuid, updates, callback );
        }
    }

    performUpdate( uuid, updates, callback ) {
        const { status } = this.parameters;
        const { sqlite } = this.dependencies;

        sqlite.updateOrder( uuid, updates, ( err, result ) => {
            callback( err, status );
        } );
    }

    handleCompletionStatus( callback ) {
        const { result, status, uuid } = this.parameters;
        const { logger, sqlite, job } = this.dependencies;
        const updates = [];

        sqlite.getOrders( "uuid", uuid, ( err, orders ) => {
            if ( err ) {
                job.error( err );
                return;
            }

            const isRequestingCompletionofAlreadyCompletedOrder = status == "completed" && orders[0].status == "completed";
            if ( isRequestingCompletionofAlreadyCompletedOrder ) {
                logger.log( "warning", `You are requesting the completion of an already completed order ${uuid}!` );
                return;
            }

            const order = orders[0];
            const parentUuid = order.parent_uuid;
            const shouldSpawnChildren = [ "channel", "playlist" ].includes( order.type );

            if ( shouldSpawnChildren ) {
                this.spawnChildren( order, result, callback );
            } else {
                updates.push( { key : "status", value : status } );
                updates.push( { key : `${status}_at`, value : Date.now() } );
                updates.push( { key : "latest_hash", value : result.hash } );

                this.performUpdate( uuid, updates, ( err, status ) => {
                    if ( parentUuid ) this.checkParentUpdate( order, parentUuid, () => {} );

                    callback( err, status );
                } );
            }
        } );
    }

    checkParentUpdate( order, parentUuid, callback ) {
        const { status, result } = this.parameters;
        const { logger, sqlite } = this.dependencies;
        const updates = [];

        sqlite.getOrders( "parent_uuid", parentUuid, ( err, orders ) => {
            if ( err ) {
                logger.log( "exception", "No matching orders found!" );
                return;
            }

            const completedOrders = orders.filter( order => order.status == "completed" );
            const allChildrenGrownUp = orders.length == completedOrders.length;

            if ( allChildrenGrownUp ) {
                updates.push( { key : "status", value : status } );
                updates.push( { key : `${status}_at`, value : Date.now() } );
            }
            updates.push( { key : "latest_hash", value : result.hash } );

            this.performUpdate( parentUuid, updates, callback );
        } );
    }

    // When a channel order completes, I am returned the ids of the channel videos. I can then process these as separate orders.
    spawnChildren( parentOrder, channelVideos, callback ) {
        const { status, uuid } = this.parameters;
        const { logger, sqlite, orderFactory, advertiser } = this.dependencies;
        const childOrders = [];
        const updates = [];

        if ( channelVideos.length == 0 ) {
            updates.push( { key : "status", value : "cancelled" } );
            updates.push( { key : "cancelled_at", value : Date.now() } );
            this.performUpdate( uuid, updates, callback );
            return;
        }

        for ( const id of channelVideos ) {
            const childOrder = orderFactory.produce( {
                ...parentOrder,
                type : "video",
                parent_uuid : parentOrder.uuid,
                url : "https://www.youtube.com/watch?v=" + id
            } );

            logger.log( "info", "Generated a child order from this completed order." );
            logger.log( "default", childOrder );

            childOrders.push( childOrder );
        }

        updates.push( { key : "status", value : "pending_child_orders" } );
        updates.push( { key : "pending_child_orders_at", value : Date.now() } );

        sqlite.saveChildOrders( childOrders, ( err, results ) => {
            if ( err ) {
                callback( err );
                return;
            }

            sqlite.updateOrder( uuid, updates, async ( err, result ) => {
                logger.log( "info", "Child orders saved, now updating original order." );

                callback( err, status );

                for ( const order of childOrders ) {
                    await ( async function( order ) {
                        return new Promise( resolve => {
                            advertiser.advertise( order, () => {
                                resolve();
                            } );
                        } );
                    } )( order );
                }
            } );
        } );
    }

    handleErrorStatus( callback ) {
        const { MAX_RETRIES_PER_ORDER, status, uuid } = this.parameters;
        const { sqlite, job, schemas, logger } = this.dependencies;
        const statuses = schemas.orderTable.rows.find( column => column.identifier == "status" ).allowedValues;
        const updates = [];

        sqlite.getOrders( "uuid", uuid, ( err, orders ) => {
            if ( err ) {
                job.error( err );
                return;
            }

            const isRequestingUpdateofAlreadyCompletedOrder = orders[0].status == "completed";
            const { error_count } = orders[0];

            if ( isRequestingUpdateofAlreadyCompletedOrder ) {
                logger.log( "warning", `You are requesting the completion of an already completed order ${uuid}!` );
                return;
            }

            // Reset statuses
            for ( const status of statuses ) {
                if ( [ "accepted" ].includes( status ) ) continue; // We do not have to reset this status

                updates.push( { key : `${status}_at`, value : Date.now() } );
            }

            updates.push( { key : "status", value : "errored" } );
            updates.push( { key : "error_count", value : error_count + 1 } );
            if ( error_count == MAX_RETRIES_PER_ORDER ) updates.push( { key : "cancelled_at", value : Date.now() } );

            this.performUpdate( uuid, updates, callback );
        } );
    }
}

module.exports = Action;
