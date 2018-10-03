/*******************************
 * [post_order_action.js]
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
        const { orderFactory, sqlite, advertiser } = this.dependencies;

        this.dependencies = {
            ...this.dependencies,
            job
        };

        const order = orderFactory.produce( this.parameters );
        sqlite.saveOrder( order, err => {
            if ( err ) {
                callback( err );
                return;
            }

            advertiser.advertise( order, ( err, result ) => {
                callback( err, {
                    ...result,
                    message : !err ? "Order registered, and queued for work!" : `Order registered, but not queued because ${err.message}, we will handle this.`
                } );
            } );
        } );
    }
}

module.exports = Action;
