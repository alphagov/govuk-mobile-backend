import type { APIGatewayProxyResult } from 'aws-lambda';
import type { ResponseBodyConfig } from './shared/response-types';
import {
  processResponseBody,
  serializeBody,
} from './shared/response-body-processor';
import { mergeHeaders } from './shared/response-headers';
import type { ResponseOptions } from './shared/response-options';

/**
 * Creates a generic API Gateway Proxy Result response
 * @param options - Response configuration options
 * @param body - Response body (will be stringified if not already a string)
 * @returns APIGatewayProxyResult
 */
function createApiGatewayResponse(
  options: ResponseOptions,
  body?: unknown,
): APIGatewayProxyResult {
  const response: APIGatewayProxyResult = {
    statusCode: options.statusCode,
    headers: mergeHeaders(options.headers),
    body: serializeBody(body),
  };

  // Only add isBase64Encoded if explicitly set to true
  if (options.isBase64Encoded === true) {
    response.isBase64Encoded = true;
  }

  return response;
}

/**
 * Creates an API Gateway response with automatic body processing.
 * Supports ResponseBodyConfig with priority: data > message > auto-generated
 *
 * Most common usage - pass data directly:
 * @example
 * createResponse(200, { users: [...] })     // Object data
 * createResponse(400, 'Bad request')        // String message
 * createResponse(500)                       // Auto-generated message
 *
 * Advanced usage - use ResponseBodyConfig:
 * @example
 * createResponse(200, { data: {...}, message: 'Custom' })
 * createResponse(400, { message: 'Validation failed' })
 * @param statusCode - HTTP status code
 * @param bodyConfig - Response body data, string message, or ResponseBodyConfig
 * @param headers - Optional additional headers
 * @returns APIGatewayProxyResult
 */
function createResponse(
  statusCode: number,
  bodyConfig?: ResponseBodyConfig | string,
  headers?: Record<string, string>,
): APIGatewayProxyResult;

/**
 * Creates an API Gateway response with full control over options.
 * Use this for advanced cases requiring base64 encoding.
 * @param options - Complete response configuration
 * @param body - Response body
 * @returns APIGatewayProxyResult
 */
function createResponse(
  options: ResponseOptions,
  body?: ResponseBodyConfig | string,
): APIGatewayProxyResult;

/**
 * Implementation function for createResponse overloads
 * @param statusCodeOrOptions - HTTP status code or response options object
 * @param bodyConfigOrBody - Response body configuration or body content
 * @param headers - Optional HTTP headers
 * @returns APIGatewayProxyResult with formatted response
 */
function createResponse(
  statusCodeOrOptions: number | ResponseOptions,
  bodyConfigOrBody?: ResponseBodyConfig | string,
  headers?: Record<string, string>,
): APIGatewayProxyResult {
  // Handle options overload (advanced usage)
  if (typeof statusCodeOrOptions === 'object') {
    return createApiGatewayResponse(statusCodeOrOptions, bodyConfigOrBody);
  }

  // Handle simple usage (most common case)
  const statusCode = statusCodeOrOptions;

  // Process the body using automatic body configuration logic
  const processed = processResponseBody(statusCode, bodyConfigOrBody ?? {});

  const options: ResponseOptions = {
    statusCode,
    ...(headers ? { headers } : {}),
  };

  // Pass the already processed body directly to createApiGatewayResponse
  return createApiGatewayResponse(options, processed.body);
}

export { createResponse };
