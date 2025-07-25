const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CERT_DIR = "./certs";
const KEY_FILE = path.join(CERT_DIR, "server.key");
const CERT_FILE = path.join(CERT_DIR, "server.crt");

/**
 * Retrieves or generates SSL certificates for GitHub API mocking
 *
 * Checks for existing SSL certificate files and returns them if found. If certificates
 * don't exist, generates new self-signed certificates using OpenSSL with proper
 * Subject Alternative Names (SANs) for GitHub domains including github.com, api.github.com,
 * *.github.com, and localhost.
 *
 * @function getSSLCertificates
 * @returns {Object} SSL certificate configuration object
 * @returns {string} returns.key - Private key content as UTF-8 string
 * @returns {string} returns.cert - Certificate content as UTF-8 string
 *
 * @throws {Error} When OpenSSL certificate generation fails or required binaries are missing
 *
 * @description Certificate details:
 * - Key type: RSA 2048-bit
 * - Validity: 365 days
 * - Subject: C=US, ST=CA, L=San Francisco, O=GitHub Mock, CN=github.com
 * - SANs: github.com, api.github.com, *.github.com, localhost, 127.0.0.1
 * - Extensions: keyEncipherment, dataEncipherment, serverAuth
 *
 * @requires fs - Node.js file system module
 * @requires child_process.execSync - For executing OpenSSL commands
 * @requires CERT_DIR - Global constant for certificate directory path
 * @requires KEY_FILE - Global constant for private key file path
 * @requires CERT_FILE - Global constant for certificate file path
 *
 * @example
 * // Returns existing certificates if found
 * const { key, cert } = getSSLCertificates();
 *
 * @example
 * // Generates new certificates if none exist
 * // Console output: "SSL certificates not found, generating new ones with OpenSSL..."
 * // Console output: "SSL certificates generated for github.com domains"
 * const sslOptions = getSSLCertificates();
 *
 * @note Requires OpenSSL to be installed and available in PATH for certificate generation
 * @note Creates certificate directory recursively if it doesn't exist
 * @note Temporary configuration file is automatically cleaned up after generation
 */
const getSSLCertificates = () => {
  // Create certs directory if it doesn't already exist
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    console.log("SSL Certificates found, using existing ones");
    return {
      key: fs.readFileSync(KEY_FILE, "utf8"),
      cert: fs.readFileSync(CERT_FILE, "utf8"),
    };
  }
  console.log(
    "SSL certificates not found, generating new ones with OpenSSL...",
  );
  try {
    // Generate private key
    execSync(`openssl genrsa -out ${KEY_FILE} 2048`, { stdio: "inherit" });

    // Create config file for certificate with proper domains
    const configContent = `[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = San Francisco
O = GitHub Mock
CN = github.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = github.com
DNS.2 = api.github.com
DNS.3 = *.github.com
DNS.4 = localhost
IP.1 = 127.0.0.1`;

    const configFile = `${CERT_DIR}/cert.conf`;
    fs.writeFileSync(configFile, configContent);

    // Generate certificate with GitHub domains
    execSync(
      `openssl req -new -x509 -key ${KEY_FILE} -out ${CERT_FILE} -days 365 -config ${configFile} -extensions v3_req`,
      { stdio: "inherit" },
    );
    console.log("SSL certificates generated for github.com domains");
    fs.unlinkSync(configFile);

    return {
      key: fs.readFileSync(KEY_FILE, "utf8"),
      cert: fs.readFileSync(CERT_FILE, "utf8"),
    };
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to generate SSL certificates: ${error.message}`);
  }
};

module.exports = getSSLCertificates;
