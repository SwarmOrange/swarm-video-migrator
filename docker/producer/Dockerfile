#FROM node:10.10.0-stretch # might also work
FROM node:8.11.0-stretch

RUN set -ex; \
    apt update -q -y; \
    DEBIAN_FRONTEND=noninteractive apt install -y python; \
    DEBIAN_FRONTEND=noninteractive apt install -y nodejs-legacy

RUN set -ex; \
    ln -s /usr/bin/python /bin/python

WORKDIR /usr/producer