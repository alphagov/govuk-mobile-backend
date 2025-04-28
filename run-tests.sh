#!/usr/bin/env bash

set -euo pipefail

echo "Running tests in ${TEST_ENVIRONMENT}"

case ${TEST_ENVIRONMENT:=build} in
    build | development)
	# Unit testing coming in GOVUKAPP-1406
	;;
    staging)
	echo "nx affected -t test:acc"
	nx affected -t test:acc
	# Infra testing coming in GOVUKAPP-1457
	# Integration testing coming in GOVUKAPP-1511
	;;
    *)
	echo "Unknown environment ${$TEST_ENVIRONMENT}"
	exit 1
esac

echo "Finished running tests in ${TEST_ENVIRONMENT}"
