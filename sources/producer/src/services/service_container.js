/*******************************
 * [service_container.js]
 * Unified service container used throughout the application
 *
 ******************************/
import fs from "fs-extra";
import basicAuth from "basic-auth";
import morgan from "morgan";
import path from "path";
import bodyParser from "body-parser";
import express from "express";
import RedisSMQ from "rsmq";
const sqlite3 = require( "sqlite3" ).verbose();
import urlParser from "url";
import generateUuid from "uuid/v4";

module.exports = {
    init : config => {
        const { REDIS_HOST, REDIS_PORT, REDIS_NS } = config;

        const rsmq = new RedisSMQ( {
            host : REDIS_HOST,
            port : REDIS_PORT,
            ns : REDIS_NS
        } );

        const logger = new ( require( "./libs/logger.js" ) )();

        const schemas = {
            orderTable : require( "../models/order_schema.js" )
        };

        const orderFactory = new ( require( "./order_factory.js" ) )( { urlParser, generateUuid, logger }, { config } );

        const sqlite = new ( require( "./sqlite.js" ) )( { logger, sqlite3, schemas }, config );
        sqlite.init();

        const io = new ( require( "./libs/io.js" ) )( {
            logger,
            fs
        } );

        const authentication = new ( require( "./authentication.js" ) )(
            {
                logger,
                basicAuth
            },
            config
        );

        const expressService = new ( require( "./express.js" ) )(
            {
                logger,
                path,
                bodyParser,
                express,
                morgan
            },
            config
        );

        const endpoints = [
            {
                address : require( "./endpoints/post_order/post_order_endpoint.js" ),
                action : require( "./endpoints/post_order/post_order_action.js" )
            },
            {
                address : require( "./endpoints/get_order_pop/get_order_pop_endpoint.js" ),
                action : require( "./endpoints/get_order_pop/get_order_pop_action.js" )
            },
            {
                address : require( "./endpoints/get_order/get_order_endpoint.js" ),
                action : require( "./endpoints/get_order/get_order_action.js" )
            },
            {
                address : require( "./endpoints/post_order_status/post_order_status_endpoint.js" ),
                action : require( "./endpoints/post_order_status/post_order_status_action.js" )
            }
        ];

        const redis = new ( require( "./redis.js" ) )(
            {
                logger,
                rsmq
            },
            config
        );
        redis.init();

        const advertiser = new ( require( "./advertiser.js" ) )(
            {
                logger,
                redis,
                schemas,
                sqlite
            },
            config
        );

        const Job = require( "./job.js" );

        const doctor = new ( require( "./doctor.js" ) )( { sqlite, logger, redis, advertiser }, config );
        doctor.init();

        return {
            schemas,
            io,
            logger,
            authentication,
            Job,
            rsmq,
            redis,
            orderFactory,
            advertiser,
            sqlite,
            generateUuid,
            urlParser,
            doctor,
            endpoints,
            express : expressService.init()
        };
    }
};
