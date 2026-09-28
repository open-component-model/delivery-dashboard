FROM node:26-alpine3.24 AS node-builder

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY index.html vite.config.js .env.production ./
COPY public ./public
COPY src ./src

RUN npm run build

################################################

FROM alpine:3.24@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6

RUN apk add --no-cache \
  lighttpd \
  && mkdir /cache \
  && chown 10000:10000 /cache

COPY --from=node-builder --chown=10000:10000 /src/dist /delivery-dashboard
COPY --chown=10000:10000 lighttpd.conf /lighttpd.conf

USER 10000:10000
ENTRYPOINT ["/usr/sbin/lighttpd", "-D", "-f", "/lighttpd.conf"]
