# Performance Testing

## Shared Signals

### Setup

- Ensure your application is deployed using aws sam:

```sh
sam build && sam deploy
```

- install `k6`:

```sh
brew install k6
```

- install dependencies:

```sh
npm i
```

### Running the tests

- create a `.env` file with the correct variables:

```sh
RECEIVER_URL=
TOKEN_EXCHANGE_URL=
CLIENT_ID=
CLIENT_SECRET=
SCOPE=
PUBLIC_KEY=
PRIVATE_KEY=
USER_POOL_ID=
AUDIENCE=
```

- **Note:** these variables are automatically exported/checked via the Makefile

The Makefile in this directory provides convenient commands for running data setup, tests, and teardown:

- **check-env** — verify required environment variables are set
- **load-shared-signals-scenario** — run the dataloader to create test data before load testing
- **run-test** — execute the main k6 performance test
- **run-smoke** — execute the k6 smoke scenario for a quick validation
- **teardown-user-pool-dry-run** — preview Cognito users that would be deleted (no changes)
- **teardown-user-pool** — delete Cognito users created by tests

To run the test in full:

- Pre-load the test data scenarios:

```sh
make load-shared-signals-scenario
```

- Run one of the performance test scenarios:

```sh
make run-test

make run-test-stress
```

- To teardown your test data:

```sh
# (Optional) preview users to delete
make teardown-user-pool-dry-run

# ...

make teardown-user-pool
```

- **Note**: some users may already have been deleted by the test scenarios.
