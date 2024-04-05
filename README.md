# Delivery Dashboard

[![REUSE status](https://api.reuse.software/badge/github.com/open-component-model/delivery-dashboard)](https://api.reuse.software/info/github.com/open-component-model/delivery-dashboard)

This repository os used for developing the `Delivery Dashboard`, which is part of the OCM
(Delivery) Gear. It is run against the `Delivery Service` as backing API and displays delivery
metadata for OCM-based deliveries.

It is written in `javascript` and uses `react` as well as the react component
framework `material-ui`.

## Development

To run the local dev server run:

`npm start`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

For startup, `Delivery-Dashboard` requires a running instance of `Delivery-Service`.
It can be configured by passing the `REACT_APP_DELIVERY_SERVICE_API_URL` environment
variable to the npm-build cmd.

## Code style

Make use of [eslint](https://eslint.org/) and use our config `.eslintrc.yml`.
Also, it is recommended to install a pre-push hook executing `eslint`.
Please note that linter plugins are expected to be installed in global npm context.
Either install them via `npm install -g` or adjust `.ci/lint` accordingly.

```
> cat delivery-dashboard/.git/hooks/pre-push

#!/usr/bin/env sh
set -e
repo_dir=$(readlink -f $(dirname $0)/../..)
${repo_dir}/.ci/lint
```
