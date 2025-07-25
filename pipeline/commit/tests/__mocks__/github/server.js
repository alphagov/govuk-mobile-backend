// mock-github-api.js
const express = require("express");
const http = require("http");
const https = require("https");
const getSSLCertificates = require("./ssl-certificates.js");

const app = express();
const PORT = 443;
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

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date()} | === MOCK REQUEST ===`);
  console.log(`${new Date()} | ${req.method} ${req.url}`);
  console.log(`${new Date()} | Headers:`, req.headers);
  console.log(
    `${new Date()} | Mock Type: ${req.headers["x-mock-type"] || "unknown"}`,
  );
  console.log(`${new Date()} | ==================`);
  next();
});

app.use("/healthcheck", require("./healthcheck.js"));
app.use("/repos/:owner/:repo/issues", require("./issues.js"));
app.use("/repos/:owner/:repo/statuses/:sha", require("./statuses.js"));
app.use(
  "/repos/:owner/:repo/pulls/:pull_number",
  require("./pull-requests.js"),
);

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

process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTPS server");
  httpsServer.close(() => {
    debug("HTTPS server closed");
  });
});
