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

load-shared-signals-scenario: check-env
	node dataloader/sharedSignals.js

teardown-user-pool-dry-run: check-env
	DRY_RUN=true node dataloader/teardown.js

teardown-user-pool: check-env
	node dataloader/teardown.js

teardown-user-pool-purge: check-env
	PREFIX=perf-test-purge node dataloader/teardown.js

run-test: check-env
	k6 run loadTest.js

run-test-stress: check-env
	MAX_VUS=150 PRE_ALLOCATED_VUS=90 PASSWORD_CRED_RATE=16 EMAIL_CRED_RATE=74 PURGE_RATE=10 k6 run loadTest.js

help:
	@echo "Available targets:"
	@echo "  check-env                      - verify required env vars are set"
	@echo "  load-shared-signals-scenario   - preload data (runs dataloader)"
	@echo "  run-test                       - run k6 main test (uses RATE/TIME_UNIT/DURATION)"
	@echo "  teardown-user-pool-dry-run     - preview users to delete (no changes)"
	@echo "  teardown-user-pool             - delete users created by dataloader"
	@echo "  teardown-user-pool-purge       - delete purge account users created by dataloader"
