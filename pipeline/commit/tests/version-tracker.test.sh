#!/bin/bash

# Set up test environment
export TEST_MODE=true
export NODE_ENV=test

# Run specific workflow tests
act -P ubuntu-latest=catthehacker/ubuntu:act-latest \
	-W ../../../.github/workflows/version-tracker.yaml \
	--secret-file ./.versiontracker.secrets "$@"

