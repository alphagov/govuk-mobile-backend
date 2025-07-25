const express = require("express");
const router = express.Router({ mergeParams: true });

/**
 * Mock GitHub API endpoint for retrieving pull request information
 *
 * Simulates the GitHub REST API endpoint: GET /repos/{owner}/{repo}/pulls/{pull_number}
 * Returns a simplified pull request object with basic properties for testing purposes.
 *
 * @route GET /repos/:owner/:repo/pulls/:pull_number
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.owner - Repository owner username
 * @param {string} req.params.repo - Repository name
 * @param {string} req.params.pull_number - Pull request number
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing mock pull request data
 * @returns {number} returns.number - Pull request number (converted to integer)
 * @returns {string} returns.title - Static test title "Test PR Title"
 * @returns {Object} returns.head - Pull request head information
 * @returns {string} returns.head.sha - Mock commit SHA
 * @returns {Object} returns.user - Pull request author information
 * @returns {string} returns.user.login - Mock username "testuser"
 * @returns {Array} returns.labels - Empty array of labels
 *
 * @example
 * // GET /repos/octocat/Hello-World/pulls/123
 * // Returns:
 * // {
 * //   "number": 123,
 * //   "title": "Test PR Title",
 * //   "head": { "sha": "..." },
 * //   "user": { "login": "testuser" },
 * //   "labels": []
 * // }
 */
router.get("/", async (req, res) => {
  const { owner, repo, pull_number } = req.params;
  console.log(
    `Mock API called: GET /repos/${owner}/${repo}/pulls/${pull_number}`,
  );

  res.json({
    number: parseInt(pull_number),
    title: "Test PR Title",
    head: { sha: "abc123def456" }, //pragma: allowlist secret
    user: { login: "testuser" },
    labels: [],
  });
});

/**
 * Mock GitHub API endpoint for retrieving pull request file changes
 *
 * Simulates the GitHub REST API endpoint: GET /repos/{owner}/{repo}/pulls/{pull_number}/files
 * Returns different sets of mock file data based on the TEST_SCENARIO environment variable
 * to support various testing scenarios with different file types and change volumes.
 *
 * @route GET /repos/:owner/:repo/pulls/:pull_number/files
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.owner - Repository owner username
 * @param {string} req.params.repo - Repository name
 * @param {string} req.params.pull_number - Pull request number
 * @param {Object} res - Express response object
 * @returns {Array<Object>} JSON array of file objects with changes
 * @returns {string} returns[].filename - Path/name of the changed file
 * @returns {number} returns[].changes - Number of changes in the file
 *
 * @description Test scenarios controlled by TEST_SCENARIO environment variable:
 * - "minor": Documentation-only changes (README, LICENSE, CHANGELOG)
 * - "standard": Mixed test files and documentation with moderate changes
 * - "security-critical" (default): Infrastructure and security-related files with high change volume
 *
 * @example
 * // With TEST_SCENARIO="minor"
 * // GET /repos/octocat/Hello-World/pulls/123/files
 * // Returns:
 * // [
 * //   { "filename": "README.md", "changes": 10 },
 * //   { "filename": "LICENSE.md", "changes": 5 },
 * //   { "filename": "CHANGELOG.md", "changes": 3 }
 * // ]
 *
 * @example
 * // With TEST_SCENARIO="security-critical" or undefined
 * // GET /repos/octocat/Hello-World/pulls/123/files
 * // Returns array with auth/template.yaml, chat/template.yaml, and other infrastructure files
 */
router.get("/files", (req, res) => {
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

  res.json(mockFiles);
});
// export router with all routes included
module.exports = router;
