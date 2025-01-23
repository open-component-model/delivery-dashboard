FROM alpine:3 AS node-builder

COPY . /src
WORKDIR /src

RUN apk add python3 --no-cache --update && .ci/template_env.py

RUN apk add --no-cache npm \
  && npm i /src \
  && npm run build

################################################

FROM alpine:3 AS lighttpd-builder

COPY Makefile .

# inspired by source build description: https://git.lighttpd.net/lighttpd/lighttpd1.4/src/branch/master/INSTALL
RUN apk add make \
  && make build-scon \
  && mkdir /cache

################################################

FROM scratch

COPY --from=lighttpd-builder --chown=10000:10000 /lighttpd /lighttpd
COPY --from=lighttpd-builder --chown=10000:10000 /cache /cache
COPY --from=node-builder --chown=10000:10000 /src/build /delivery-dashboard
COPY --chown=10000:10000 lighttpd.conf /lighttpd.conf

USER 10000:10000
ENTRYPOINT ["/lighttpd", "-D", "-f", "/lighttpd.conf"]