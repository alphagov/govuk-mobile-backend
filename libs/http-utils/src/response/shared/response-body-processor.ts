import type {
  ResponseBodyConfig,
  ProcessedResponseBody,
} from './response-types';
import { getReasonPhrase } from './status-mappings';

const successStatusMin = 200;
const successStatusMax = 300;
const errorStatusMin = 400;

/**
 * Processes response body configuration and returns the appropriate response body
 * @param statusCode - HTTP status code for auto-generation context
 * @param bodyConfig - Configuration object or string
 * @returns Processed response body
 */
function processResponseBody(
  statusCode: number,
  bodyConfig: ResponseBodyConfig | string = {},
): ProcessedResponseBody {
  // If bodyConfig is a string, treat it as a message
  if (typeof bodyConfig === 'string') {
    bodyConfig = { message: bodyConfig };
  }

  let responseBody: unknown = {};

  // Priority: data > message > auto-generated
  if (bodyConfig.data != null) {
    responseBody = bodyConfig.data;
  } else if (bodyConfig.message != null) {
    responseBody = { message: bodyConfig.message };
  } else {
    // Auto-generate based on status code
    const isSuccess =
      statusCode >= successStatusMin && statusCode < successStatusMax;
    const isError = statusCode >= errorStatusMin;

    if (isError) {
      const defaultErrorMessage = getReasonPhrase(statusCode);
      responseBody = { error: defaultErrorMessage };
    } else if (isSuccess) {
      const defaultSuccessMessage = getReasonPhrase(statusCode);
      responseBody = { message: defaultSuccessMessage };
    } else {
      responseBody = {};
    }
  }

  return { body: responseBody };
}

/**
 * Shared body serialization logic
 * @param body - Body to serialize
 * @returns Serialized body string
 */
function serializeBody(body?: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body ?? {});
}

export { processResponseBody, serializeBody };
