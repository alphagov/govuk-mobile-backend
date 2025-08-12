export $(shell sed 's/=.*//' .env)
include .env

REQUIRED_VARS := RECEIVER_URL TOKEN_EXCHANGE_URL CLIENT_ID CLIENT_SECRET SCOPE PRIVATE_KEY USER_POOL_ID AUDIENCE PUBLIC_KEY

check-env:
	@bash -c ' \
	for var in $(REQUIRED_VARS); do \
		if [ -z "$${!var}" ]; then \
			echo "Missing environment variable: $$var"; \
			exit 1; \
		fi; \
	done'

load-shared-signals-scenario:
	node dataloader/sharedSignals.js

teardown-user-pool-dry-run:
	DRY_RUN=true node dataloader/teardown.js

teardown-user-pool:
	node dataloader/teardown.js

run-test: check-env 
	k6 run loadTest.js

run-smoke: check-env 
	SCENARIO=smoke k6 run loadTest.js

run-stress: check-env 
	SCENARIO=stress k6 run loadTest.js

help:
	@echo "Available targets:"
	@echo "  check-env                      - verify required env vars are set"
	@echo "  load-shared-signals-scenario  - preload data (runs npm script in dataloader)"
	@echo "  run-test                       - run k6 main test"
	@echo "  run-smoke                      - run k6 smoke scenario"
	@echo "  run-stress                      - run k6 stress scenario"
	@echo "  teardown-user-pool-dry-run     - preview users to delete (no changes)"
	@echo "  teardown-user-pool             - delete users created by tests"
