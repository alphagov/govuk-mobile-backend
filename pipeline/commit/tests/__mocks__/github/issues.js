const express = require("express");
const router = express.Router({ mergeParams: true });

// In-memory storage for created issues (simulates GitHub's persistence)
let createdIssues = [];
let issueCounter = 1000; // Start with a high number to avoid conflicts

/**
 * GET /repos/:owner/:repo/issues
 *
 * Mocks GitHub's List repository issues API endpoint.
 *
 * This endpoint supports filtering issues by labels and state, and maintains
 * in-memory storage of issues created during the test session to simulate
 * GitHub's persistence behavior.
 *
 * @route GET /repos/:owner/:repo/issues
 * @param {string} req.params.owner - Repository owner (organization or user)
 * @param {string} req.params.repo - Repository name
 * @param {string} [req.query.labels] - Comma-separated list of label names to filter by
 * @param {string} [req.query.state] - Issue state filter: 'open', 'closed', or 'all' (default: 'open')
 *
 * @returns {Array<Object>} Array of GitHub issue objects
 *
 * @behavior
 * - When filtering by 'peer-review' label: Returns issues from in-memory storage
 * - When not filtering by 'peer-review': Returns hardcoded scenario-based mock data
 * - Supports state filtering ('open', 'closed', 'all')
 * - Maintains compatibility with GitHub Issues API v3 response format
 *
 * @example
 * // Get all open issues
 * GET /repos/owner/repo/issues
 *
 * // Get peer review issues (searches in-memory storage)
 * GET /repos/owner/repo/issues?labels=peer-review&state=all
 *
 * // Get closed security issues
 * GET /repos/owner/repo/issues?labels=security&state=closed
 */
router.get("/", async (req, res) => {
  const { owner, repo } = req.params;
  const { labels, state } = req.query;

  console.log(`Mock API called: GET /repos/${owner}/${repo}/issues`);
  console.log("Query params:", req.query);
  console.log(`Current stored issues count: ${createdIssues.length}`);
  console.log(
    "Stored issues:",
    createdIssues.map((i) => ({
      number: i.number,
      title: i.title,
      labels: i.labels.map((l) => l.name),
      body_preview: i.body?.substring(0, 100) + "...",
    })),
  );

  // Filter by labels if specified
  let filteredIssues = [...createdIssues];

  if (labels) {
    const requestedLabels = labels.split(",").map((l) => l.trim());
    filteredIssues = filteredIssues.filter((issue) =>
      issue.labels.some((label) => requestedLabels.includes(label.name)),
    );
  }

  // Filter by state if specified
  if (state && state !== "all") {
    filteredIssues = filteredIssues.filter((issue) => issue.state === state);
  }

  // If looking for peer-review issues and none exist, return empty array
  if (labels && labels.includes("peer-review") && filteredIssues.length === 0) {
    console.log("No peer-review issues found in storage");
    return res.json([]);
  }

  // If not filtering by peer-review labels, return scenario-based mock data
  if (!labels || !labels.includes("peer-review")) {
    const scenario = process.env.TEST_SCENARIO || "security-critical";
    let mockIssues;

    switch (scenario) {
      case "minor":
        mockIssues = [
          {
            id: 1,
            number: 123,
            title: "Minor documentation update",
            state: "open",
            user: { login: "test-user" },
            body: "Small typo fixes in README",
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        break;

      case "standard":
        mockIssues = [
          {
            id: 1,
            number: 123,
            title: "Add new authentication tests",
            state: "open",
            user: { login: "test-user" },
            body: "Need to add comprehensive tests for auth module",
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            number: 124,
            title: "Update API gateway configuration",
            state: "open",
            user: { login: "another-user" },
            body: "Gateway needs configuration updates for new endpoints",
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        break;

      case "security-critical":
      default:
        mockIssues = [
          {
            id: 1,
            number: 123,
            title: "SECURITY: Authentication bypass vulnerability",
            state: "open",
            user: { login: "security-team" },
            body: "Critical security vulnerability found in auth module that allows bypass",
            labels: [{ name: "security", color: "ff0000" }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            number: 124,
            title: "Infrastructure template contains sensitive data",
            state: "open",
            user: { login: "devops-team" },
            body: "Template files contain hardcoded credentials that need immediate attention",
            labels: [
              { name: "security", color: "ff0000" },
              { name: "infrastructure", color: "0052cc" },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        break;
    }

    return res.json(mockIssues);
  }

  console.log(
    `Returning ${filteredIssues.length} peer-review issues from storage`,
  );
  res.json(filteredIssues);
});

/**
 * Mock GitHub Issues API - Create an Issue
 *
 * Simulates the GitHub REST API endpoint POST /repos/{owner}/{repo}/issues
 * for creating new issues in a repository. This mock endpoint provides realistic
 * responses for testing and development purposes without making actual API calls.
 *
 * @route POST /repos/:owner/:repo/issues
 * @param {string} owner - Repository owner username or organization name
 * @param {string} repo - Repository name
 *
 * @body {Object} Issue data
 * @body {string} title - Required. The title of the issue
 * @body {string} [body] - Optional. The contents of the issue description
 * @body {Array<string|Object>} [labels] - Optional. Labels to associate with the issue.
 *   Can be an array of strings (label names) or objects with 'name' and 'color' properties.
 *   String labels are automatically converted to GitHub API format with default gray color.
 * @body {Array<string>} [assignees] - Optional. Usernames of people to assign the issue to
 *
 * @returns {Object} 201 - Mock GitHub issue object with realistic structure
 * @returns {number} returns.id - Unique issue ID (randomly generated)
 * @returns {string} returns.node_id - GitHub GraphQL node ID
 * @returns {number} returns.number - Sequential issue number (auto-incremented)
 * @returns {string} returns.title - Issue title
 * @returns {string} returns.body - Issue body/description
 * @returns {Array<Object>} returns.labels - Normalized label objects with name and color
 * @returns {string} returns.state - Issue state (always "open" for new issues)
 * @returns {Array<string>} returns.assignees - Assigned users
 * @returns {string} returns.created_at - ISO timestamp of creation
 * @returns {string} returns.updated_at - ISO timestamp of last update
 * @returns {Object} returns.user - Mock bot user object
 * @returns {string} returns.url - API URL for the issue
 * @returns {string} returns.html_url - Web URL for the issue
 *
 * @example
 * // Create a simple issue
 * POST /repos/octocat/Hello-World/issues
 * {
 *   "title": "Found a bug",
 *   "body": "I'm having trouble with this feature",
 *   "labels": ["bug", "help wanted"],
 *   "assignees": ["octocat"]
 * }
 *
 * @example
 * // Create issue with label objects
 * POST /repos/octocat/Hello-World/issues
 * {
 *   "title": "Enhancement request",
 *   "labels": [
 *     {"name": "enhancement", "color": "a2eeef"},
 *     "documentation"
 *   ]
 * }
 *
 * @note This is a mock implementation that:
 * - Stores created issues in memory for retrieval by other endpoints
 * - Automatically increments issue numbers using a counter
 * - Normalizes label formats (string to object conversion)
 * - Generates realistic GitHub API response structure
 * - Uses github-actions[bot] as the default issue creator
 *
 * @see {@link https://docs.github.com/en/rest/issues/issues#create-an-issue} GitHub API Documentation
 */
router.post("/", async (req, res) => {
  const { owner, repo } = req.params;
  const { title, body, labels, assignees } = req.body;

  console.log(`Mock API called: POST /repos/${owner}/${repo}/issues`);
  console.log("Issue data:", { title, body, labels, assignees });

  // Normalize labels - handle both string array and object array formats
  let normalizedLabels = [];
  if (labels) {
    normalizedLabels = labels.map((label) => {
      if (typeof label === "string") {
        // Convert string to GitHub API format
        return { name: label, color: "cccccc" };
      } else if (label && label.name) {
        // Already in correct format
        return label;
      }
      return { name: String(label), color: "cccccc" };
    });
  }

  console.log(
    "Normalized labels:",
    normalizedLabels.map((l) => l.name),
  );

  // Generate a mock response that looks like a real GitHub issue
  const issueNumber = issueCounter++;
  const mockIssue = {
    id: Math.floor(Math.random() * 1000000), // Random ID
    node_id: "MDU6SXNzdWU" + Math.floor(Math.random() * 1000000),
    url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    repository_url: `https://api.github.com/repos/${owner}/${repo}`,
    labels_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels{/name}`,
    comments_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    events_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/events`,
    html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
    number: issueNumber,
    title: title,
    user: {
      login: "github-actions[bot]",
      id: 41898282,
      node_id: "MDM6Qm90NDE4OTgyODI=",
      avatar_id: "https://avatars.githubusercontent.com/in/15368?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/github-actions%5Bbot%5D",
      html_url: "https://github.com/apps/github-actions",
      type: "Bot",
      site_admin: false,
    },
    labels: normalizedLabels,
    state: "open",
    locked: false,
    assignee: null,
    assignees: assignees || [],
    milestone: null,
    comments: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
    author_association: "NONE",
    active_lock_reason: null,
    body: body,
    timeline_url: `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/timeline`,
    performed_via_github_app: {
      id: 15368,
      slug: "github-actions",
      node_id: "MDM6QXBwMTUzNjg=",
      name: "GitHub Actions",
    },
  };

  // Store the issue in memory for later retrieval
  createdIssues.push(mockIssue);

  console.log(`Created and stored mock issue #${mockIssue.number}: ${title}`);
  console.log(`Total stored issues: ${createdIssues.length}`);

  res.status(201).json(mockIssue);
});

/**
 * Mock GitHub Issues API - Create a Comment
 *
 * Simulates the GitHub REST API endpoint POST /repos/{owner}/{repo}/issues/{issue_number}/comments
 * for creating new comments on existing issues. This mock endpoint provides realistic
 * responses for testing and development purposes without making actual API calls.
 *
 * @route POST /repos/:owner/:repo/issues/:issue_number/comments
 * @param {string} owner - Repository owner username or organization name
 * @param {string} repo - Repository name
 * @param {string|number} issue_number - The number that identifies the issue
 *
 * @body {Object} Comment data
 * @body {string} body - Required. The contents of the comment
 *
 * @returns {Object} 200 - Mock GitHub comment object
 * @returns {number} returns.id - Comment ID (fixed at 123456 for mock)
 * @returns {string} returns.body - The comment text content
 * @returns {string} returns.created_at - ISO timestamp of comment creation
 * @returns {Object} returns.user - Comment author information
 * @returns {string} returns.user.login - Username of comment author (github-actions[bot])
 * @returns {number} returns.user.id - User ID of comment author
 *
 * @example
 * // Create a comment on issue #42
 * POST /repos/octocat/Hello-World/issues/42/comments
 * {
 *   "body": "Thanks for reporting this issue! We'll look into it."
 * }
 *
 * @example
 * // Response
 * {
 *   "id": 123456,
 *   "body": "Thanks for reporting this issue! We'll look into it.",
 *   "created_at": "2024-01-15T10:30:45.123Z",
 *   "user": {
 *     "login": "github-actions[bot]",
 *     "id": 41898282
 *   }
 * }
 *
 * @note This is a mock implementation that:
 * - Uses a fixed comment ID (123456) for all comments
 * - Always attributes comments to github-actions[bot] user
 * - Does not validate if the issue number exists
 * - Does not store comments in memory (unlike the issues endpoint)
 * - Provides minimal comment object structure for basic testing needs
 *
 * @see {@link https://docs.github.com/en/rest/issues/comments#create-an-issue-comment} GitHub API Documentation
 */
// Mock the issues.createComment endpoint
router.post("/:issue_number/comments", (req, res) => {
  const { owner, repo, issue_number } = req.params;
  console.log(
    `Mock API called: POST /repos/${owner}/${repo}/issues/${issue_number}/comments`,
  );
  console.log("Comment body:", req.body.body);

  res.json({
    id: 123456,
    body: req.body.body,
    created_at: new Date().toISOString(),
    user: {
      login: "github-actions[bot]",
      id: 41898282,
    },
  });
});

/**
 * Mock GitHub Issues API - Update an Issue
 *
 * Simulates the GitHub REST API endpoint PATCH /repos/{owner}/{repo}/issues/{issue_number}
 * for updating existing issues. This mock endpoint allows modifying issue properties,
 * particularly useful for testing state changes like closing issues.
 *
 * @route PATCH /repos/:owner/:repo/issues/:issue_number
 * @param {string} owner - Repository owner username or organization name
 * @param {string} repo - Repository name
 * @param {string|number} issue_number - The number that identifies the issue to update
 *
 * @body {Object} Update data
 * @body {string} [state] - Optional. State of the issue. Either "open" or "closed"
 * @body {string} [title] - Optional. The title of the issue (accepted but not processed)
 * @body {string} [body] - Optional. The contents of the issue (accepted but not processed)
 * @body {Array} [labels] - Optional. Labels for the issue (accepted but not processed)
 * @body {Array} [assignees] - Optional. Assignees for the issue (accepted but not processed)
 *
 * @returns {Object} 200 - Updated issue object
 * @returns {number} returns.id - Issue ID
 * @returns {number} returns.number - Issue number
 * @returns {string} returns.state - Updated issue state ("open" or "closed")
 * @returns {string} returns.updated_at - ISO timestamp of last update
 * @returns {string|null} returns.closed_at - ISO timestamp when closed, or null if open
 * @returns {Object} [returns.*] - If issue exists in storage, returns full issue object
 *
 * @example
 * // Close an issue
 * PATCH /repos/octocat/Hello-World/issues/42
 * {
 *   "state": "closed"
 * }
 *
 * @example
 * // Reopen an issue
 * PATCH /repos/octocat/Hello-World/issues/42
 * {
 *   "state": "open"
 * }
 *
 * @example
 * // Response for existing issue
 * {
 *   "id": 847291,
 *   "number": 42,
 *   "title": "Found a bug",
 *   "state": "closed",
 *   "labels": [...],
 *   "created_at": "2024-01-15T09:00:00.000Z",
 *   "updated_at": "2024-01-15T10:30:45.123Z",
 *   "closed_at": "2024-01-15T10:30:45.123Z",
 *   // ... full issue object
 * }
 *
 * @note This is a mock implementation that:
 * - Searches for the issue in memory storage (createdIssues array)
 * - Updates stored issues with new state and timestamps
 * - Sets closed_at when state changes to "closed"
 * - Returns full issue object if found in storage
 * - Returns minimal mock response if issue not found in storage
 * - Currently only processes the 'state' field, other fields are accepted but ignored
 * - Primarily designed for testing issue state transitions
 *
 * @see {@link https://docs.github.com/en/rest/issues/issues#update-an-issue} GitHub API Documentation
 */
router.patch("/:issue_number", (req, res) => {
  const { owner, repo, issue_number } = req.params;
  const { state } = req.body;

  console.log(
    `Mock API called: PATCH /repos/${owner}/${repo}/issues/${issue_number}`,
  );
  console.log("Update data:", req.body);

  // Find and update the issue in storage
  const issue = createdIssues.find((i) => i.number == issue_number);
  if (issue) {
    issue.state = state || issue.state;
    issue.updated_at = new Date().toISOString();
    if (state === "closed") {
      issue.closed_at = new Date().toISOString();
    }
    console.log(`Updated issue #${issue_number} state to: ${issue.state}`);
    return res.json(issue);
  }

  // If not found in storage, return a mock response
  res.json({
    id: Math.floor(Math.random() * 1000000),
    number: parseInt(issue_number),
    state: state || "open",
    updated_at: new Date().toISOString(),
    closed_at: state === "closed" ? new Date().toISOString() : null,
  });
});

/**
 * Mock GitHub Issues API - Clear All Stored Issues
 *
 * Custom utility endpoint for clearing the in-memory storage of mock issues.
 * This is not part of the official GitHub API but provides a convenient way
 * to reset the mock data during testing and development.
 *
 * @route DELETE /repos/:owner/:repo/issues
 * @param {string} owner - Repository owner (URL parameter, not used in logic)
 * @param {string} repo - Repository name (URL parameter, not used in logic)
 *
 * @returns {Object} 200 - Confirmation of cleanup operation
 * @returns {string} returns.message - Human-readable confirmation message
 * @returns {number} returns.count - Current count of stored issues (always 0 after cleanup)
 *
 * @example
 * // Clear all mock issues
 * DELETE /repos/octocat/Hello-World/issues
 *
 * @example
 * // Response
 * {
 *   "message": "Cleared 5 issues",
 *   "count": 0
 * }
 *
 * @sideEffects
 * - Empties the createdIssues array (clears all stored mock issues)
 * - Resets issueCounter to 1000 (next created issue will be #1000)
 * - Logs cleanup operation to console
 *
 * @note This is a custom utility endpoint that:
 * - Is NOT part of the official GitHub REST API
 * - Provides a way to reset mock data between test runs
 * - Affects global state (createdIssues array and issueCounter)
 * - Does not validate owner/repo parameters (they're ignored)
 * - Should only be used in testing/development environments
 * - Helps maintain clean test isolation by clearing previous test data
 *
 * @warning This operation cannot be undone. All previously created mock issues
 * will be permanently removed from memory.
 *
 * @see This endpoint complements the POST /issues endpoint for complete test lifecycle management
 */
router.delete("/", (req, res) => {
  const clearedCount = createdIssues.length;
  createdIssues = [];
  issueCounter = 1000;
  console.log(`Cleared ${clearedCount} stored issues`);
  res.json({ message: `Cleared ${clearedCount} issues`, count: 0 });
});

// export router with all routes included
module.exports = router;
