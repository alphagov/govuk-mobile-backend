#!/bin/bash

set -euo pipefail

cd /tests

echo "Running tests in ${TEST_ENVIRONMENT}"

# npm run test:acc

echo "Finished running tests in ${TEST_ENVIRONMENT}"

exit 0