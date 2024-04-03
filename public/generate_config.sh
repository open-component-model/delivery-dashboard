#!/usr/bin/env bash

# This script is used to dynamically generate the config.js file after the build
# step. The config.js file is then executed by the index.html in order to retrieve
# the URL of the delivery-service from the environment variable set during the
# deployment.

cat > /usr/share/nginx/html/config.js << EOF
window.REACT_APP_DELIVERY_SERVICE_API_URL = '${REACT_APP_DELIVERY_SERVICE_API_URL}'
EOF
