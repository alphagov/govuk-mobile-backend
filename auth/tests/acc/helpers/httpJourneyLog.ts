import { RequestOptions } from "node:https";
import { HTTP_RESPONSE } from "./requestAsync";

interface JourneyLogEntry {
  hostName: string | null | undefined;
  path: string | null | undefined;
  statusCode: number;
  step: number;
}

const journeyLog: JourneyLogEntry[] = [];

/** @function redactSensitiveInfo
 * Redacts sensitive information in path string
 * @param {string} path - The path string containing sensitive information
 * @returns {string} Returns redacted path string
 */
const redactSensitiveInfo = (path: string | null | undefined): string => {
  if (!path) {
    throw new Error("Path is null or undefined");
  }
  // Common sensitive parameters in OIDC/OAuth flows
  const sensitiveParams = [
    "access_token",
    "assertion",
    "authorization",
    "bearer",
    "client_assertion",
    "client_id",
    "client_secret",
    "code",
    "code_challenge",
    "id_token",
    "jwt",
    "nonce",
    "refresh_token",
    "request",
    "session_id",
    "session_token",
    "state",
    "password",
    "username",
  ];

  let redactedPath = path;

  // Redact query parameters
  const [basePath, queryString] = path.split("?");
  if (queryString) {
    const params = new URLSearchParams(queryString);

    for (const [key, value] of params.entries()) {
      if (
        sensitiveParams.some((sensitive) =>
          key.toLowerCase().includes(sensitive.toLowerCase()),
        )
      ) {
        params.set(key, "[REDACTED]");
      }
    }

    redactedPath = `${basePath}?${params.toString()}`;
  }

  // Redact JWT tokens in path segments (common pattern: /token/eyJ...)
  redactedPath = redactedPath.replace(
    /\/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    "/[JWT_TOKEN_REDACTED]",
  );

  // Redact UUIDs and long alphanumeric strings that might be tokens
  redactedPath = redactedPath.replace(
    /\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g,
    "/[UUID_REDACTED]",
  );

  // Redact long alphanumeric strings (potential tokens)
  redactedPath = redactedPath.replace(
    /\/[A-Za-z0-9]{32,}/g,
    "/[TOKEN_REDACTED]",
  );

  return redactedPath;
};

/** @function addJourneyLogEntry
 * Adds a redacted log entry to the journey log
 * @param {RequestOptions} request - HTTP Request part of the journey
 * @param {HTTP_RESPONSE} response - HTTP Response part of the journey
 * @returns {void}
 */
const addJourneyLogEntry = (
  request: RequestOptions,
  response: HTTP_RESPONSE,
): void => {
  journeyLog.push({
    hostName: request.hostname,
    path: redactSensitiveInfo(request.path),
    statusCode: response.statusCode,
    step: journeyLog.length + 1,
  });
};

/** @function getJourneyLogEntries
 * Returns a copy of the log entries
 * @returns {[]} Return description
 */
const getJourneyLogEntries = (): [] => {
  return JSON.parse(JSON.stringify(journeyLog));
};

export { addJourneyLogEntry, getJourneyLogEntries };
