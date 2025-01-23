FROM alpine:3 AS node-builder

WORKDIR /src

RUN --mount=type=bind,source=.,target=/src,rw \
  apk add --no-cache --update \
    python3 \
    npm \
  && .ci/template_env.py \
  && npm i /src \
  && npm run build \
  && mv /src/build /build

################################################

FROM alpine:3

RUN apk add --no-cache \
  lighttpd \
  && mkdir /cache \
  && chown 10000:10000 /cache

COPY --from=node-builder --chown=10000:10000 /build /delivery-dashboard
COPY --chown=10000:10000 lighttpd.conf /lighttpd.conf

USER 10000:10000
ENTRYPOINT ["/usr/sbin/lighttpd", "-D", "-f", "/lighttpd.conf"]