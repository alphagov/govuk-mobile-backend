#!/bin/sh
set -e

echo "Checking for SSL certificates..."

if [ ! -f /etc/nginx/certs/github.crt ] || [ ! -f /etc/nginx/certs/github.key ]; then
    echo "Generating SSL certificates for github.com..."
    
    # Generate private key
    openssl genrsa -out /etc/nginx/certs/github.key 2048
    
    # Create config file with SAN
    cat > /tmp/cert.conf << 'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = github.com
O = Mock GitHub
C = US

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = github.com
DNS.2 = api.github.com
DNS.3 = *.github.com
IP.1 = 127.0.0.1
EOF
    
    # Generate certificate with SAN
    openssl req -new -x509 -key /etc/nginx/certs/github.key \
        -out /etc/nginx/certs/github.crt \
        -days 365 \
        -config /tmp/cert.conf \
        -extensions v3_req
    
    # Set permissions
    chmod 644 /etc/nginx/certs/github.crt
    chmod 600 /etc/nginx/certs/github.key
    
    # Clean up
    rm /tmp/cert.conf
    
    echo "SSL certificates generated successfully"
    
    # Display certificate info for debugging
    echo "Certificate details:"
    openssl x509 -in /etc/nginx/certs/github.crt -text -noout | grep -A 5 "Subject:"
    echo ""
    openssl x509 -in /etc/nginx/certs/github.crt -text -noout | grep -A 10 "Subject Alternative Name" || echo "No SAN found"
else
    echo "SSL certificates already exist"
fi
