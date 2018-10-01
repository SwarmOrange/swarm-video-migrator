/*******************************
 * [get_status_action.js]
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

        const { sqlite } = this.dependencies;
        const { uuid } = this.parameters;

        sqlite.getOrder( uuid, ( err, result ) => {
            callback( err, result );
        } );
    }
}

module.exports = Action;
