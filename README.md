# swarm-video-migrator

## Getting started

### Prerequisites

1. `docker`
1. `docker-compose`
1. `youtube-dl` binary _(http://rg3.github.io/)_
1. `ffmpeg` binary
1. `ffprobe` binary

### Installation

1. Create a `.env` file (see included `.env.dist`) and fill in the variable for the environment you want (e.g. `prod` or `dev`)
1. Create a _your_env_.json config file in `config/` and name it the same as your intended environment (see included `dev.json`)
1. Download the required binaries from their respective websites and put them in `volumes/vendor`
1. `docker-compose run producer npm i`
1. `docker-compose run consumer npm i`
1. `docker-compose up` _(-d)_ `producer`
1. `docker-compose up` _(-d)_ `consumer`

## Endpoints<sup>[1]</sup>

### (EXTERNAL)<sup>[2]</sup> /api/post/order

Post orders here.

#### Payload example:

```
{
    "url" : "https://www.youtube.com/watch?v=9pCYyrlnRiY",
    "swarm_hash" : "your_swarm_hash",
    "quality" : "hd"
    "output" : "video"
}
```

#### Payload keys:

1. "url" is the piece of content to download
2. "swarm_hash" is the location to upload the content to
3. "quality" : `hd` or `sd`
4. "output" : `audio` or `video` (video includes audio)

### (INTERAL)<sup>[3]</sup> /api/get/order

Query this endpoint to get an order.

### (INTERAL) /api/get/status/:uuid

Query this endpoint to get an order status by the uuid provided

### (INTERAL) /api/post/status/

Query this endpoint to get an order status by the uuid provided

#### Payload example:

```
{
    "uuid" : "https://www.youtube.com/watch?v=9pCYyrlnRiY",
    "status" : "your_status",
    "result" : "job_results" //optional
}
```

## [Annotations]

1. All endpoints are configured to require a successful BASIC authentication with username/password.
1. External in the sense that this is an advertised endpoint for the outside to request new orders.
1. Internal in the sense that these are endpoints for communication between consumers and the producer.

## Flow:

![](images/swarm-video-migrator.png?raw=true)

## TL;DR:

Set env & config file, install docker (+compose), send an order to `/api/post/order`. Producer takes the order, registers it in the SQLite DB, and pushes a work order to the Redis queue. Consumers pull from the Redis queue through the producer, and does work on the order (downloading, transcoding, uploading).

## Credit

1. `youtube-dl` is used as the downloading and transcoding of the videos, see http://rg3.github.io/
2. `ffmpeg` and `ffprobe` are used as well.
