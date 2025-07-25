#!/bin/sh
set -e

echo "Starting GitHub Proxy Nginx..."

# Generate certificates if needed
/usr/local/bin/generate-certs.sh

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
