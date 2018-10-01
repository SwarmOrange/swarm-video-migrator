/*******************************
 * [index.js]
 * Init entry-point
 *
 ******************************/

import Application from "./src/app";
const config = require( `./config/${process.env.NODE_ENV}.json` );

new Application( config ).init();
