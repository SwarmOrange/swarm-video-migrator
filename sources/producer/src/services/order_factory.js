/*******************************
 * [order_factory.js]
 * Churns out orders.
 *
 ******************************/

class OrderFactory {
    constructor( dependencies, config ) {
        this.dependencies = dependencies;
        this.config = config;
    }

    produce( parameters ) {
        const { url, swarm_hash, output, quality, parent_uuid, upload_to, album_id } = parameters;
        const { generateUuid } = this.dependencies;
        const status = "accepted";
        const uuid = generateUuid();
        const type = this.getOrderType( url );
        const source = this.getOrderSource( url );
        const accepted_at = Date.now();

        let order = {
            uuid,
            status,
            url,
            swarm_hash,
            type,
            upload_to,
            source,
            accepted_at
        };

        // otherwise sqlite query dies (should not be passed as undefined)
        if ( output ) order.output = output;
        if ( quality ) order.quality = quality;
        if ( parent_uuid ) order.parent_uuid = parent_uuid;
        if ( album_id ) order.album_id = album_id;

        return order;
    }

    getOrderType( url ) {
        if ( !url.toLowerCase().includes( "youtube" ) ) throw new Error( "Unsupported service" );

        if ( url.toLowerCase().includes( "playlist" ) ) return "playlist";
        if ( url.toLowerCase().includes( "channel" ) ) return "channel";
        if ( url.toLowerCase().includes( "user" ) ) return "channel";
        if ( url.toLowerCase().includes( "watch" ) ) return "video";

        throw new Error( "Unknown content type!" );
    }

    getOrderSource( url ) {
        const { urlParser } = this.dependencies;

        if ( !url.includes( "http://" ) && !url.includes( "https://" ) ) url = "http://" + url;
        const result = urlParser.parse( url );
        const host = result.host.replace( "www.", "" ).split( "." )[0];

        return host;
    }
}

module.exports = OrderFactory;
