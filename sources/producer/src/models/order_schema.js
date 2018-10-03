/*******************************
 * [order_schema.js]
 * Schema for the order table in the SQLite db.
 *
 ******************************/ module.exports = {
    rows : [
        {
            identifier : "uuid",
            mandatory : true,
            type : "text",
            primary : true
        },
        {
            identifier : "parent_uuid",
            mandatory : false,
            type : "text"
        },
        {
            identifier : "status",
            mandatory : true,
            type : "text",
            allowedValues : ["accepted", "advertised", "pulled", "processed", "pending_child_orders", "completed", "errored", "cancelled"]
        },
        {
            identifier : "type",
            mandatory : true,
            type : "text",
            allowedValues : ["playlist", "video", "channel"]
        },
        {
            identifier : "output",
            mandatory : false,
            defaultValue : "video",
            type : "text",
            allowedValues : ["audio_video", "video", "audio", "title", "filename"]
        },
        {
            identifier : "source",
            mandatory : true,
            type : "text",
            allowedValues : ["youtube"]
        },
        {
            identifier : "url",
            mandatory : true,
            type : "text"
        },
        {
            identifier : "quality",
            mandatory : false,
            defaultValue : "sd",
            type : "string"
        },
        {
            identifier : "error_count",
            mandatory : false,
            defaultValue : 0,
            type : "integer"
        },
        {
            identifier : "swarm_hash",
            mandatory : true,
            type : "text"
        },
        {
            identifier : "accepted_at",
            mandatory : true,
            type : "integer"
        },
        {
            identifier : "advertised_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "pulled_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "processed_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "pending_child_orders_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "completed_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "cancelled_at",
            mandatory : false,
            type : "integer"
        },
        {
            identifier : "errored_at",
            mandatory : false,
            type : "integer"
        }
    ]
};
