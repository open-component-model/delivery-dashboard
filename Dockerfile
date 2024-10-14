FROM alpine:latest AS build

COPY . /src
WORKDIR /src

RUN apk add python3 --no-cache --update && .ci/template_env.py

RUN apk add --no-cache npm \
  && npm i /src \
  && npm run build

FROM nginx:latest

COPY --from=build  /src/build /usr/share/nginx/html

ENTRYPOINT ["/bin/bash", "-c", "/usr/share/nginx/html/generate_config.sh && nginx -g \"daemon off;\""]
