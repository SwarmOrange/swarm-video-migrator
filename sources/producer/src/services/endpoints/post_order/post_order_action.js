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
        const { orderFactory, advertiser } = this.dependencies;

        this.dependencies = {
            ...this.dependencies,
            job
        };

        const order = orderFactory.produce( this.parameters );
        advertiser.advertise( order, callback );
    }
}

module.exports = Action;
