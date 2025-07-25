// mock-github-api.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { execSync } = require("child_process");

const app = express();
const PORT = 443;
const CERT_DIR = "./certs";
const KEY_FILE = path.join(CERT_DIR, "server.key");
const CERT_FILE = path.join(CERT_DIR, "server.crt");
const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_BASE = "https://github.com";

app.use(express.json());
app.use(express.raw({ type: "application/x-git-*" }));

const githubAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false,
  secureProtocol: "TLSv1_2_method",
  key: undefined,
  cert: undefined,
  ca: undefined,
});

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

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`=== MOCK REQUEST ===`);
  console.log(`${req.method} ${req.url}`);
  console.log(`Headers:`, req.headers);
  console.log(`Mock Type: ${req.headers["x-mock-type"] || "unknown"}`);
  console.log(`==================`);
  next();
});

// Mock the pulls.listFiles endpoint
app.get("/repos/:owner/:repo/pulls/:pull_number/files", (req, res) => {
  const { owner, repo, pull_number } = req.params;

  console.log(
    `Mock API called: GET /repos/${owner}/${repo}/pulls/${pull_number}/files`,
  );

  // Different mock responses based on test scenario
  const scenario = process.env.TEST_SCENARIO || "security-critical";

  let mockFiles;

  switch (scenario) {
    case "minor":
      mockFiles = [
        { filename: "README.md", changes: 10 },
        { filename: "LICENSE.md", changes: 5 },
        { filename: "CHANGELOG.md", changes: 3 },
      ];
      break;

    case "standard":
      mockFiles = [
        { filename: "auth/tests/acc/attestation.test.ts", changes: 50 },
        { filename: "chat/tests/acc/api-gateway.test.ts", changes: 30 },
        { filename: "README.md", changes: 5 },
      ];
      break;

    case "security-critical":
    default:
      mockFiles = [
        { filename: "auth/template.yaml", changes: 80 },
        { filename: "chat/template.yaml", changes: 120 },
        { filename: "auth/proxy/app.ts", changes: 5 },
        { filename: "chat/authorizer/app.ts", changes: 120 },
        { filename: "package.json", changes: 15 },
        { filename: "README.md", changes: 10 },
      ];
      break;
  }

  res.json({ data: mockFiles });
});

// Mock the issues.createComment endpoint
app.post("/repos/:owner/:repo/issues/:issue_number/comments", (req, res) => {
  const { owner, repo, issue_number } = req.params;
  console.log(
    `Mock API called: POST /repos/${owner}/${repo}/issues/${issue_number}/comments`,
  );
  console.log("Comment body:", req.body.body);

  res.json({
    id: 123456,
    body: req.body.body,
    created_at: new Date().toISOString(),
  });
});

const credentials = getSSLCertificates();
const httpsServer = https.createServer(credentials, app);

console.log("Certificate loaded:", credentials.cert.substring(0, 50) + "...");
console.log("Key loaded:", credentials.key.substring(0, 50) + "...");

httpsServer.on("secureConnection", (tlsSocket) => {
  console.log("Secure connection established");
});

httpsServer.on("clientError", (err, socket) => {
  console.error("Client error:", err.message);
});

httpsServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Mock GitHub API server running on https://localhost:${PORT}`);
  console.log(
    `Test scenario: ${process.env.TEST_SCENARIO || "security-critical"}`,
  );
});
