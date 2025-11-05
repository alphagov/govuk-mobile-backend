import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ResponseBodyConfig } from './shared/response-types';
import {
  processResponseBody,
  serializeBody,
} from './shared/response-body-processor';
import { mergeHeaders } from './shared/response-headers';
import type { ResponseOptionsV2 } from './shared/response-options';

/**
 * Internal helper: Creates an API Gateway V2 response
 * @param options - Response configuration options
 * @param body - Response body (will be stringified if not already a string)
 * @returns APIGatewayProxyResultV2
 */
function createApiGatewayResponseV2Internal(
  options: ResponseOptionsV2,
  body?: unknown,
): APIGatewayProxyResultV2 {
  return {
    statusCode: options.statusCode,
    headers: mergeHeaders(options.headers),
    body: serializeBody(body),
    ...(options.cookies && { cookies: options.cookies }),
  };
}

/**
 * Creates an API Gateway V2 response.
 * Supports ResponseBodyConfig with priority: data > message > auto-generated
 *
 * Most common usage - pass data directly:
 * @example
 * createResponseV2(200, { users: [...] })     // Object data
 * createResponseV2(400, 'Bad request')        // String message
 * createResponseV2(500)                       // Auto-generated message
 *
 * Advanced usage - use ResponseBodyConfig:
 * @example
 * createResponseV2(200, { data: {...}, message: 'Custom' })
 * createResponseV2(400, { message: 'Validation failed' })
 * @param statusCode - HTTP status code
 * @param bodyConfig - Response body data, string message, or ResponseBodyConfig
 * @param headers - Optional additional headers
 * @returns APIGatewayProxyResultV2
 */
function createResponseV2(
  statusCode: number,
  bodyConfig?: ResponseBodyConfig | string,
  headers?: Record<string, string>,
): APIGatewayProxyResultV2;

/**
 * Creates an API Gateway V2 response with full control over options.
 * Use this for advanced cases requiring cookies.
 * @param options - Complete response configuration including cookies
 * @param body - Response body
 * @returns APIGatewayProxyResultV2
 */
function createResponseV2(
  options: ResponseOptionsV2,
  body?: ResponseBodyConfig | string,
): APIGatewayProxyResultV2;

/**
 * Implementation function for createResponseV2 overloads
 * @param statusCodeOrOptions - HTTP status code or response options object
 * @param bodyConfigOrBody - Response body configuration or body content
 * @param headers - Optional HTTP headers
 * @returns APIGatewayProxyResultV2 with formatted response
 */
function createResponseV2(
  statusCodeOrOptions: number | ResponseOptionsV2,
  bodyConfigOrBody?: ResponseBodyConfig | string,
  headers?: Record<string, string>,
): APIGatewayProxyResultV2 {
  // Handle options overload (advanced usage)
  if (typeof statusCodeOrOptions === 'object') {
    return createApiGatewayResponseV2Internal(
      statusCodeOrOptions,
      bodyConfigOrBody,
    );
  }

  // Handle simple usage (most common case)
  const statusCode = statusCodeOrOptions;

  // Process the body using automatic body configuration logic
  const bodyConfig: ResponseBodyConfig | string = bodyConfigOrBody ?? {};
  const processed = processResponseBody(statusCode, bodyConfig);

  const options: ResponseOptionsV2 = {
    statusCode,
    ...(headers ? { headers } : {}),
  };

  return createApiGatewayResponseV2Internal(options, processed.body);
}

export { createResponseV2 };
