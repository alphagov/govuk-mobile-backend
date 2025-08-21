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

git clone "https://github.com/alphagov/govuk-mobile-backend.git" /tmp/repo
cd /tmp/repo
# npm i

# Find which branches contain this commit
BRANCHES=$(git branch -r --contains "$commitsha" 2>/dev/null | grep -E "(origin/main|origin/production)")

if echo "$BRANCHES" | grep -q "origin/production" && ! echo "$BRANCHES" | grep -q "origin/main"; then
    BASE_BRANCH="origin/production"
    echo "Using production as base"
elif echo "$BRANCHES" | grep -q "origin/main"; then
    BASE_BRANCH="origin/main"
    echo "Using main as base"
else
    echo "Error: Commit not found in main or production"
    exit 1
fi

echo "Performing branch checks"

# 1. Check if we're in the penultimate environment
# Note TEST_ENVIRONMENT is being forced to lowercase here by using ${VAR,,}
# Also not we run this on local for testing purposes
if [[ "${TEST_ENVIRONMENT,,}" == @(staging|local) ]]; then
    
    echo -e "${YELLOW}🍌 Starting production deployment safety checks...${NC}"

    # 2. Git cli check
    if ! command -v git >/dev/null 2>&1
    then
	echo -e "${RED}✘ ERROR: git is not installed in this testing container. Exiting ...${NC}"
	exit 1
    fi
    
    # 2. Git lineage check - using the commit SHA that's already extracted
    if [[ -z "$commitsha" ]]; then
	echo -e "${RED}✘ ERROR: Commit SHA not available for lineage check${NC}"
	exit 1
    fi

    echo -e "${YELLOW}🍌 Checking git lineage for commit: $commitsha${NC}"

    # Check if the commit exists on your production branch
    if [[ "$BASE_BRANCH" != "origin/production" ]]; then
	echo -e "${RED}✘ ERROR: Commit $commitsha is not from production branch${NC}"
	if ! git show "$commitsha" 2>/dev/null; then
	    echo -e "${RED}✘ The sha $commitsha does not appear to be a valid commit${NC}"
	else
	    echo -e "${RED}✘ This appears to be a feature branch deployment. Only hotfixes are allowed to be promoted at this time.${NC}"
	fi
	exit 1
    fi

    echo -e "${GREEN}✓ Git lineage check passed: commit $commitsha originated from production branch${NC}"
    echo -e "${GREEN}✓ All safety checks passed! Proceeding with deployment to Production and Integration environments...${NC}"

fi

exit 0