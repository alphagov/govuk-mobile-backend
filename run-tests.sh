#!/usr/bin/env bash

set -euo pipefail

echo "Running tests in ${TEST_ENVIRONMENT}"

case ${TEST_ENVIRONMENT:=build} in
    build | development)
	echo "nx affected -t test:unit"
	nx affected -t test:unit
	;;
    staging)
	echo "nx affected -t test:acc"
	nx affected -t test:acc
	echo "nx affected -t test:infra"
	nx affected -t test:infra
	;;
    *)
	echo "Unknown environment ${$TEST_ENVIRONMENT}"
	exit 1
esac

echo "Finished running tests in ${TEST_ENVIRONMENT}"
