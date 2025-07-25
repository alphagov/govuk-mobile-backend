#!/bin/sh

set -e

echo "Starting act runner script..."

# Wait for github-proxy to be ready
echo 'Waiting for github-proxy to be ready...'
until curl -k -s https://github-proxy:443 >/dev/null 2>&1; do
  echo 'Waiting for github-proxy:443...'
  sleep 2
done

# Find proxy IP using multiple methods
echo 'Finding proxy container IP...'
PROXY_IP=$(docker inspect github-proxy --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1 | tr -d '\n')

if [ -z "$PROXY_IP" ]; then
  echo 'Trying getent hosts method...'
  PROXY_IP=$(getent hosts github-proxy | awk '{print $1}' | head -1)
fi

if [ -z "$PROXY_IP" ]; then
  echo 'Using fallback IP'
  PROXY_IP="172.18.0.2"
fi

echo "Final proxy IP: '$PROXY_IP'"

# Add entries to /etc/hosts
echo "Adding DNS entries..."
echo "$PROXY_IP github.com" >> /etc/hosts
echo "$PROXY_IP api.github.com" >> /etc/hosts

# Verify DNS resolution
echo 'Testing DNS resolution:'
nslookup github.com || true
nslookup api.github.com || true

# Test SSL connection to proxy
echo 'Testing SSL connection to github-proxy...'
openssl s_client -connect github-proxy:443 -servername github.com -verify_return_error < /dev/null 2>&1 | head -20 || true

# Test API routing
echo 'Testing api.github.com routing...'
curl -k -v https://api.github.com/test 2>&1 | head -10 || true

# Test github.com routing
echo 'Testing github.com routing...'
curl -k -v https://github.com/test 2>&1 | head -10 || true

# Download and install certificate
echo 'Downloading certificate...'
echo -n | openssl s_client -connect github.com:443 -servername github.com 2>/dev/null | openssl x509 > /usr/local/share/ca-certificates/mock-github.crt
update-ca-certificates

# Initialize git repository
echo 'Initializing mock git repository...'
git config --global init.defaultBranch main
git config --global user.email 'test@example.com'
git config --global user.name 'Test User'
git config --global safe.directory /home/node/testrunner
git init .
git remote add origin https://github.com/test-org/test-repo.git
echo 'test' > README.md
git add .
git commit -m 'Initial commit'
git tag v1.0.0
echo 'Git repository initialized successfully'

# Find the Docker network name
NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E '(github|default)' | head -1)
echo "Network name: '$NETWORK_NAME'"

# Option 1: Try without explicit network specification (let act use default)
echo 'Running act with container options (no explicit network)...'
echo "Container options will be: --add-host=github.com:$PROXY_IP --add-host=api.github.com:$PROXY_IP"

act pull_request \
  -P node:22.17.1-slim \
  -W ./.github/workflows/3-tier-peer-review.yaml \
  -e ./__mocks__/mock-pr-event.json \
  -v \
  --defaultbranch main \
  --no-recurse \
  -s GITHUB_TOKEN=mock_token_12345 \
  --container-options="--add-host=github.com:$PROXY_IP --add-host=api.github.com:$PROXY_IP -e GODEBUG=x509ignoreCN=0 -e GOINSECURE=github.com,api.github.com -e SSL_VERIFY=false -e NODE_TLS_REJECT_UNAUTHORIZED=0"

