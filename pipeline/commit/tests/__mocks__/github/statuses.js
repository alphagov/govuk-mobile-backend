const express = require("express");
const router = express.Router({ mergeParams: true });

/**
 * Mock GitHub API endpoint for creating commit status
 *
 * Simulates the GitHub REST API endpoint: POST /repos/{owner}/{repo}/statuses/{sha}
 * Creates a commit status for the specified SHA and returns a mock response with
 * the provided status information plus generated metadata.
 *
 * @route POST /repos/:owner/:repo/statuses/:sha
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.owner - Repository owner username
 * @param {string} req.params.repo - Repository name
 * @param {string} req.params.sha - Commit SHA to create status for
 * @param {Object} req.body - Request body containing status information
 * @param {string} req.body.state - Status state (e.g., "pending", "success", "error", "failure")
 * @param {string} req.body.description - Short description of the status
 * @param {string} req.body.context - Unique context identifier for the status
 * @param {string} [req.body.target_url] - Optional URL for more details about the status
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing the created status
 * @returns {number} returns.id - Generated status ID (mock value: 654321)
 * @returns {string} returns.state - Status state from request body
 * @returns {string} returns.description - Status description from request body
 * @returns {string} returns.context - Status context from request body
 * @returns {string} returns.target_url - Target URL from request body (if provided)
 * @returns {string} returns.created_at - ISO timestamp of status creation
 *
 * @example
 * // POST /repos/octocat/Hello-World/statuses/abc123def456
 * // Request body:
 * // {
 * //   "state": "success",
 * //   "description": "Build succeeded",
 * //   "context": "continuous-integration/jenkins",
 * //   "target_url": "https://ci.example.com/build/123"
 * // }
 * //
 * // Response:
 * // {
 * //   "id": 654321,
 * //   "state": "success",
 * //   "description": "Build succeeded",
 * //   "context": "continuous-integration/jenkins",
 * //   "target_url": "https://ci.example.com/build/123",
 * //   "created_at": "2024-08-07T14:30:00.000Z"
 * // }
 */
router.post("/", async (req, res) => {
  const { owner, repo, sha } = req.params;
  console.log(`Mock API called: POST /repos/${owner}/${repo}/statuses/${sha}`);
  console.log("Status data:", req.body);

  res.json({
    id: 654321,
    state: req.body.state,
    description: req.body.description,
    context: req.body.context,
    target_url: req.body.target_url,
    created_at: new Date().toISOString(),
  });
});
// export router with all routes included
module.exports = router;
