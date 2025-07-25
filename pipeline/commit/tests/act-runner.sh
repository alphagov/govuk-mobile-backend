#!/bin/sh

# Container initialization script for act runners
echo "=== Container Setup Starting ==="

# Add host entries (these should already be there from --add-host, but just in case)
if [ -n "$PROXY_IP" ]; then
    echo "$PROXY_IP github.com" >> /etc/hosts
    echo "$PROXY_IP api.github.com" >> /etc/hosts
    echo "Added host entries for $PROXY_IP"
fi

# Install certificates if possible
if command -v openssl >/dev/null 2>&1 && command -v update-ca-certificates >/dev/null 2>&1; then
    echo "Installing SSL certificates..."
    
	# Download certificate from proxy
    echo -n | openssl s_client -connect github.com:443 -servername github.com 2>/dev/null | openssl x509 > /usr/local/share/ca-certificates/mock-github.crt 2>/dev/null || {
        echo "Failed to download certificate, creating minimal cert..."
        # Create a minimal self-signed cert as fallback
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout /tmp/temp.key \
            -out /usr/local/share/ca-certificates/mock-github.crt \
            -subj "/CN=github.com" 2>/dev/null || true
    }
    
    # Update certificate store
    update-ca-certificates 2>/dev/null || true
    echo "Certificate installation attempted"
else
    echo "OpenSSL or update-ca-certificates not available, skipping cert install"
fi

# Set Go-specific environment variables for the process
export GODEBUG=x509ignoreCN=0
export GOINSECURE=github.com,api.github.com
export SSL_VERIFY=false

echo "=== Container Setup Complete ==="

# Execute the original command
exec "$@"
