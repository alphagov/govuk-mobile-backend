# Performance Testing

## Setup

* Deploy this PR using aws sam:

```sh
sam build && sam deploy
```

* This deploys cognito as an OAuth2 provider without OL as an IdP
* This also whitelist's the test runner's IP addresses

* install `k6`:

```sh
brew install k6
```

* install `xk6` and `pkce` extension:

```sh
go install go.k6.io/xk6/cmd/xk6@latest

xk6 build --with github.com/frankhefeng/xk6-oauth-pkce@latest
```

## Running the tests

* export required environment variables:

```sh
export AUTHORIZATION_URL=
export ATTESTATION_TOKEN_GEN_URL=
export TOKEN_EXCHANGE_URL=
export CLIENT_ID=
export REDIRECT_URI=
export CLIENT_SECRET=
```

* run the test:

```
make run-test
```