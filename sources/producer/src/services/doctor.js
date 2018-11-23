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

    async pullStaleOrders( callback ) {
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
                    WHERE
                    (
                        type = '${JOB_TYPE}'
                        AND status IS NOT 'advertised'
                        AND status IS NOT 'pending_child_orders'
                        AND completed_at IS NULL
                        AND
                        (
                            error_count < ${MAX_RETRIES_PER_ORDER}
                            AND ${theTime} - pulled_at > ${JOB_LENGTH}
                        )
                    )
                    OR
                    (
                        status = 'errored'
                        AND error_count < ${MAX_RETRIES_PER_ORDER}
                    )
                    OR
                    (
                        status = 'accepted'
                        AND ${theTime} - pulled_at > ${JOB_LENGTH}
                    )
                `;
            }

            logger.log( "info", `Checking for stale items of type ${JOB_TYPE}` );
            await ( async function( query ) {
                return new Promise( resolve => {
                    sqlite.open( db => {
                        db.all( query, ( err, results ) => {
                            if ( err ) {
                                logger.log( "exception", err );
                                return;
                            }
                            callback( err, results );
                            resolve();
                        } );

                        db.close();
                    } );
                } );
            } )( query );
        }
    }

    async repushOrder( order ) {
        const { logger, redis, advertiser } = this.dependencies;

        logger.log( "info", "Repushing order" );

        return new Promise( resolve => {
            advertiser.advertise( order, ( err, id ) => {
                resolve();
            } );
        } );
    }
}

module.exports = Doctor;
