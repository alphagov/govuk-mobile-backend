const express = require("express");
const router = express.Router({});

/**
 * Health check endpoint for monitoring application status
 *
 * Provides a simple health check response with uptime, status message, and timestamp
 * for monitoring and load balancer health checks. Returns HTTP 200 on success or
 * HTTP 503 on failure.
 *
 * @route GET /
 * @param {Object} _req - Express request object (unused)
 * @param {Object} res - Express response object
 * @param {Function} _next - Express next middleware function (unused)
 * @returns {Object} JSON response containing health status information
 * @returns {number} returns.uptime - Process uptime in seconds
 * @returns {string} returns.message - Status message ("OK" on success, error on failure)
 * @returns {number} returns.timestamp - Current timestamp in milliseconds since epoch
 *
 * @throws {503} Service Unavailable - When an error occurs during health check
 *
 * @example
 * // GET /
 * // Success response (HTTP 200):
 * // {
 * //   "uptime": 3600.123,
 * //   "message": "OK",
 * //   "timestamp": 1691420400000
 * // }
 *
 * @example
 * // Error response (HTTP 503):
 * // Empty response body with 503 status code
 */
router.get("/", async (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
  };
  try {
    res.send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).send();
  }
});
// export router with all routes included
module.exports = router;
