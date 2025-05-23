#!/usr/bin/env bash

set -euo pipefail

echo "Running tests in ${TEST_ENVIRONMENT}"

echo "nx affected -t test:acc"
nx affected -t test:acc

echo "Finished running tests in ${TEST_ENVIRONMENT}"
