#!/usr/bin/env python3

import os
import string


own_dir = os.path.abspath(os.path.dirname(__file__))
repo_dir = os.path.abspath(os.path.join(own_dir, os.pardir))
version_file_path = os.path.join(repo_dir, 'VERSION')
env_file_path = os.path.join(repo_dir, '.env.production')


def render_file(file_path: str, values: dict):
    print(f'templating {file_path} file')
    with open(file=file_path) as f:
        data = string.Template(f.read()).substitute(values)

    with open(file=file_path, mode="w") as f:
        f.write(data)


if __name__ == "__main__":
    print('Start templating script')
    print()

    with open(version_file_path, 'r') as version_file:
        version = version_file.read().strip()

    template = {
        'build_version': version,
    }

    print(f'build number: {version}')

    render_file(env_file_path, template)

    print()
    print('Script finished')
