/**
 * Default headers for API Gateway responses
 */
const defaultResponseHeaders = {
  'Content-Type': 'application/json',
} as const;

/**
 * Merges default headers with provided headers
 * @param headers - Optional custom headers
 * @returns Merged headers object
 */
function mergeHeaders(
  headers?: Record<string, string>,
): Record<string, string> {
  return { ...defaultResponseHeaders, ...headers };
}

export { defaultResponseHeaders, mergeHeaders };
