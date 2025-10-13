#!/bin/bash

set -euo pipefail

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /tests

echo "Running tests in ${TEST_ENVIRONMENT}"

nx run auth:test:acc 
nx run auth:test:int 

echo "Finished running tests in ${TEST_ENVIRONMENT}"

exit 0
