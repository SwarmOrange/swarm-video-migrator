/*******************************
 * [sqlite.js]
 * Database manager
 *
 ******************************/

class Sqlite {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
    }

    init() {
        const { logger } = this.dependencies;
        logger.log( "info", "Service sqlite initialising" );

        this.createDb();
    }

    createDb() {
        const { orderTable } = this.dependencies.schemas;
        const { SQLITE_ORDER_TABLE } = this.config;

        this.open( db => {
            // Create DB if not exists
            let query = `CREATE TABLE IF NOT EXISTS ${SQLITE_ORDER_TABLE} (`;

            for ( const i in orderTable.rows ) {
                const column = orderTable.rows[i];
                const { identifier, primary, mandatory, type, allowedValues, defaultValue } = column;
                const hasDefaultValue = defaultValue || defaultValue === 0;
                const setDefaultValueAs = hasDefaultValue ? `DEFAULT ${typeof defaultValue == "string" ? `${defaultValue}` : defaultValue}` : null;
                const restrictValues = allowedValues ? `CHECK ( ${identifier} IN ( ${allowedValues.map( x => `'${x}'` ).join( ", " )} ) )` : "";
                const setAsPrimary = primary ? "PRIMARY KEY" : "";
                const setAsMandatory = mandatory ? "NOT NULL" : "";
                const isLastColumn = i == orderTable.rows.length - 1;

                const fragment = `
                  ${identifier} ${type} ${setDefaultValueAs} ${restrictValues} ${setAsPrimary} ${setAsMandatory}${isLastColumn ? ")" : ","}
                `;
                query += fragment;
            }

            db.run( query );
            db.close();
        } );
    }

    saveOrder( order, callback ) {
        const keys = Object.keys( order );
        const { SQLITE_ORDER_TABLE } = this.config;

        this.open( db => {
            let query = `INSERT INTO ${SQLITE_ORDER_TABLE} (`;

            // Define all the columns that we will insert into
            for ( const i in Object.keys( keys ) ) {
                const isLastColumn = i == keys.length - 1;
                const key = keys[i];
                query += `${key}${isLastColumn ? ")" : ","}`;
            }

            // Now all the values that go into those columns
            query += " Values( ";
            for ( const i in Object.keys( keys ) ) {
                const isLastColumn = i == keys.length - 1;
                const key = keys[i];
                let value = order[key];

                const shouldLowerCase = [ "type", "output" ].includes( key ); // clean the user input
                if ( shouldLowerCase ) value = value.toLowerCase();

                if ( typeof value == "string" ) value = `'${value}'`;

                query += `${value}${isLastColumn ? ")" : ","}`;
            }

            db.run( query, err => {
                callback( err );
            } );

            db.close();
        } );
    }

    /*
         WARNING: Because of the query structure, orders MUST be uniform in the amount of columns you want to write.
         Values of those columns can be different though.
         If you are using this function for child orders and basing the child off of the parent, then that works fine.
    */
    saveChildOrders( orders, callback ) {
        const { SQLITE_ORDER_TABLE } = this.config;
        const columns = Object.keys( orders[0] );

        this.open( db => {
            let query = `INSERT INTO ${SQLITE_ORDER_TABLE} (`;

            // Define all the columns that we will insert into
            for ( const i in Object.keys( columns ) ) {
                const isLastColumn = i == columns.length - 1;
                const key = columns[i];
                query += `${key}${isLastColumn ? ")" : ","}`;
            }

            // Now all the values that go into those columns
            query += " Values ";
            for ( const i in orders ) {
                const order = orders[i];
                const isLastOrder = i == orders.length - 1;
                query += " ( ";

                for ( const i in Object.keys( columns ) ) {
                    const isLastColumn = i == columns.length - 1;
                    const key = columns[i];
                    let value = order[key];

                    const shouldLowerCase = [ "type", "output" ].includes( key ); // clean the user input
                    if ( shouldLowerCase ) value = value.toLowerCase();

                    if ( typeof value == "string" ) value = `'${value}'`;

                    query += `${value}${isLastColumn ? ")" : ","}`;
                }

                if ( !isLastOrder ) query += ",";
            }

            db.run( query, err => {
                callback( err );
            } );

            db.close();
        } );
    }

    getOrders( key, value, callback ) {
        const { SQLITE_ORDER_TABLE } = this.config;

        this.open( db => {
            const query = `SELECT * FROM ${SQLITE_ORDER_TABLE} WHERE ${key} = '${value}'`;

            db.all( query, ( err, result ) => {
                if ( ( !result && !err ) || ( result.length == 0 && !err ) ) err = new Error( "Orders not found!" ); // urgh...

                callback( err, result );
            } );

            db.close();
        } );
    }

    updateOrder( uuid, updates, callback ) {
        const { SQLITE_ORDER_TABLE } = this.config;

        this.open( db => {
            let query = `UPDATE ${SQLITE_ORDER_TABLE} SET`;

            for ( const i in updates ) {
                const update = updates[i];
                const isLastColumn = i == updates.length - 1;
                let { key, value } = update;

                value = typeof value == "string" ? `'${value}'` : value;
                query += `
                    ${key} = ${value}${isLastColumn ? ` WHERE uuid = '${uuid}'` : ","}
                `;
            }

            db.run( query, ( err, result ) => {
                callback( err, result );
            } );

            db.close();
        } );
    }

    /*
         WARNING: Because of the query structure, orders MUST be uniform in the amount of columns you want to write.
         Values of those columns can be different though.
         If you are using this function for child orders and basing the child off of the parent, then that works fine.
    */
    updateOrders( orders, callback ) {
        const { SQLITE_ORDER_TABLE } = this.config;
        const columns = Object.keys( orders[0] );

        this.open( db => {
            let query = `UPDATE ${SQLITE_ORDER_TABLE} SET`;

            // Define all the columns that we will insert into
            for ( const i in Object.keys( columns ) ) {
                const isLastColumn = i == columns.length - 1;
                const key = columns[i];
                query += `${key}${isLastColumn ? ")" : ","}`;
            }

            // Now all the values that go into those columns
            query += " Values ";
            for ( const i in orders ) {
                const order = orders[i];
                const isLastOrder = i == orders.length - 1;
                query += " ( ";

                for ( const i in Object.keys( columns ) ) {
                    const isLastColumn = i == columns.length - 1;
                    const key = columns[i];
                    let value = order[key];

                    const shouldLowerCase = [ "type", "output" ].includes( key ); // clean the user input
                    if ( shouldLowerCase ) value = value.toLowerCase();

                    if ( typeof value == "string" ) value = `'${value}'`;

                    query += `${value}${isLastColumn ? ")" : ","}`;
                }

                if ( !isLastOrder ) query += ",";
            }

            db.run( query, err => {
                callback( err );
            } );

            db.close();
        } );
    }

    open( callback ) {
        const { sqlite3, logger } = this.dependencies;
        const { SQLITE_DB_LOCATION } = this.config;

        const db = new sqlite3.Database( SQLITE_DB_LOCATION, err => {
            if ( err ) {
                throw err;
            }

            logger.log( "info", "Connected to the sqlite db." );

            callback( db );
        } );
    }

    close( db ) {
        db.close( err => {
            const { logger } = this.dependencies;

            if ( err ) {
                return console.error( err.message );
            }

            logger.log( "info", "Closed the database connection." );
        } );
    }
}

module.exports = Sqlite;
