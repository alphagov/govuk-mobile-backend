#!/usr/bin/env bash

set -eu

# find . -type d -maxdepth 1 -regex '^\./[^.]*' ! -name '*-hook'
find . -type d -maxdepth 1 -regex '^\./[^.]*' ! -name 'stack-orchestration-tool' ! -name 'shared-steps' ! -name 'node_modules' ! -name '.github' ! -name 'lambda-versions-pruner'