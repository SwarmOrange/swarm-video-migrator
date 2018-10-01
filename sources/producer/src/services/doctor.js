/*******************************
 * [doctor.js]
 * Monitors application health and makes adjustments where necessary
 *
 ******************************/

class Doctor {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
        this.repushStaleOrders = this.repushStaleOrders.bind( this );
    }

    init( callback ) {
        const { logger } = this.dependencies;
        const { CHECK_STALE_ITEMS_EVERY_N_MILLISECONDS } = this.config;

        logger.log( "info", "Service doctor initialising" );

        setInterval( this.repushStaleOrders, CHECK_STALE_ITEMS_EVERY_N_MILLISECONDS );
    }

    repushStaleOrders() {
        const { logger } = this.dependencies;

        logger.log( "info", "Checking for stale items" );

        this.pullStaleOrders( async ( err, results ) => {
            logger.log( "info", `Found ${results.length} stale items` );

            for ( const order of results ) {
                await this.repushOrder( order );
            }
        } );
    }

    pullStaleOrders( callback ) {
        const { MAX_JOB_TIMES, SQLITE_ORDER_TABLE, MAX_RETRIES_PER_ORDER } = this.config;
        const { sqlite, logger } = this.dependencies;

        for ( const job of MAX_JOB_TIMES ) {
            const { JOB_TYPE, JOB_LENGTH } = job;
            const theTime = Date.now();
            let query;

            if ( JOB_LENGTH == "infinite" ) {
                query = `
                    SELECT * FROM ${SQLITE_ORDER_TABLE}
                    WHERE type = '${JOB_TYPE}'
                    AND status = 'errored'
                    AND error_count < ${MAX_RETRIES_PER_ORDER}
                `;
            } else {
                query = `
                    SELECT * FROM ${SQLITE_ORDER_TABLE}
                    WHERE type = '${JOB_TYPE}'
                    AND completed_at IS NULL
                    AND
                    (
                        error_count < ${MAX_RETRIES_PER_ORDER}
                        AND ${theTime} - pulled_at > ${JOB_LENGTH}

                    )
                    OR
                    (
                        status = 'errored'
                        AND error_count < ${MAX_RETRIES_PER_ORDER}
                    )
                `;
            }

            logger.log( "info", `Checking for stale items of type ${JOB_TYPE}` );
            sqlite.open( db => {
                db.all( query, ( err, results ) => {
                    if ( err ) {
                        logger.log( "exception", err );
                        return;
                    }

                    callback( err, results );
                } );

                db.close();
            } );
        }
    }

    async repushOrder( order ) {
        const { uuid } = order;
        const { logger, schemas, sqlite, redis } = this.dependencies;

        logger.log( "info", "Repushing order" );

        return new Promise( resolve => {
            redis.saveOrder( uuid, ( err, id ) => {
                if ( err ) {
                    logger.log( "exception", `Failed to save order ${uuid} to the redis queue:` );
                    logger.log( "default", err );
                    return;
                } else {
                    logger.log( "info", `Saved order ${uuid} to redis as ${id}` );
                }

                const updates = [{ key : "status", value : "accepted" }];
                const statuses = schemas.orderTable.rows.find( column => column.identifier == "status" ).allowedValues;

                for ( const status of statuses ) {
                    if ( status == "accepted" ) continue;

                    updates.push( { key : `${status}_at`, value : null } );
                }

                sqlite.updateOrder( uuid, updates, ( err, result ) => {
                    if ( err ) {
                        throw Error( err );
                        return;
                    }

                    logger.log( "info", "Updated order" );
                    resolve( result );
                } );
            } );
        } );
    }
}

module.exports = Doctor;
