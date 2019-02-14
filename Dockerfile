# https://docs.ghost.org/supported-node-versions/
# https://github.com/nodejs/LTS
FROM node:8-alpine

ENV NODE_ENV production
ENV GHOST_NODE_VERSION_CHECK false
ENV INSTALL /opt/ccb
ENV CONTENT /opt/ccb/content
ENV VERSION 2.11.1

RUN mkdir -p "$INSTALL"; \
	mkdir -p "$CONTENT"; \
	mkdir -p "$CONTENT"/images; \
	chown node:node "$INSTALL";

WORKDIR $INSTALL

# Install yarn and other dependencies via apk
RUN apk update && apk add yarn supervisor g++ make && rm -rf /var/cache/apk/*
COPY package.json yarn.lock /opt/ccb/
RUN yarn install --frozen-lockfile

COPY . /opt/ccb
COPY ./content/themes/casper /opt/ccb/content/themes/casper

EXPOSE 2368
# CMD ["node", "index.js"]
CMD ["supervisord", "--nodaemon", "--configuration", "/opt/ccb/docker/supervisord.conf"]
# CMD ["supervisord", "-n", "-c", "/opt/vsm-worker/docker-config/supervisor_worker.conf"]
