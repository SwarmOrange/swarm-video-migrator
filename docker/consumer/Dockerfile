#FROM node:alpine
# Other versions of node throw build errors, could give this a shot with newer node versions: https://stackoverflow.com/questions/14772508/npm-failed-to-install-time-with-make-not-found-error
FROM node:8.11.0-stretch

RUN set -ex; \
    apt update -q -y; \
    DEBIAN_FRONTEND=noninteractive apt install -y python;

RUN set -ex; \
    ln -s /usr/bin/python /bin/python

WORKDIR /usr/consumer


#RUN npm install
#CMD ["npm", "run", "watch"]
