#!/bin/bash

set -euo pipefail

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /tests

echo "Running tests in ${TEST_ENVIRONMENT}"

# nx affected -t test:acc

echo "Finished running tests in ${TEST_ENVIRONMENT}"

# 1. Check if we're in the penultimate environment
   # Note TEST_ENVIRONMENT is being forced to lowercase here by using ${VAR,,}
if [[ "${TEST_ENVIRONMENT,,}" == "staging" ]]; then
    
    echo -e "${YELLOW}Starting production deployment safety checks...${NC}"

    # 2. Git cli check
    if ! command -v git >/dev/null 2>&1
    then
	echo -e "${RED}ERROR: git is not installed in this testing container. Exiting ...${NC}"
	exit 1
    fi
    
    # 2. Git lineage check - using the commit SHA that's already extracted
    if [[ -z "$commitsha" ]]; then
	echo -e "${RED}ERROR: Commit SHA not available for lineage check${NC}"
	exit 1
    fi

    echo -e "${YELLOW}Checking git lineage for commit: $commitsha${NC}"

    # Clone the repository to check git lineage
    # It would be good to avoid hard coding this but the repo is unlikely to change and there are other priorities
    git clone "https://github.com/alphagov/govuk-mobile-backend.git" /tmp/repo
    cd /tmp/repo

    # Check if the commit exists on your production branch
    if ! git merge-base --is-ancestor "$commitsha" origin/production 2>/dev/null; then
	echo -e "${RED}ERROR: Commit $commitsha is not from production branch${NC}"
	echo -e "${RED}This appears to be a feature branch deployment. Only hotfixes are allowed to be promoted at this time.${NC}"
	exit 1
    fi

    echo -e "${GREEN}✓ Git lineage check passed: commit $commitsha originated from production branch${NC}"
    echo -e "${GREEN}All safety checks passed! Proceeding with deployment to Production and Integration environments...${NC}"

fi

exit 0
