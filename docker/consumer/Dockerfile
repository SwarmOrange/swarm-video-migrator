#FROM node:alpine
FROM node:10.11.0-stretch

RUN set -ex; \
    apt update -q -y; \
    DEBIAN_FRONTEND=noninteractive apt install -y python;

RUN set -ex; \
    ln -s /usr/bin/python /bin/python

WORKDIR /usr/consumer


#RUN npm install
#CMD ["npm", "run", "watch"]
