import querystring from 'querystring';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { SanitizedRequestHeaders } from './sanitize-headers';
import type { RequestBody } from './validation/body';
import { sendHttpRequest } from '@libs/http-utils';
import type { AppConfig } from './config';

/**
 * Proxies an HTTP request to the specified hostname and path using HTTPS.
 * @param hostname - The target server's hostname.
 * @param path - The request path on the target server.
 * @param body - The request body as a string, or undefined if not applicable.
 * @param headers - The HTTP headers to send with the request.
 * @param config
 * @param method - The HTTP method to use (default is 'GET').
 * @returns A promise that resolves to an APIGatewayProxyResultV2 containing the response.
 */
async function _proxyRequest(
  hostname: string,
  path: string,
  body: string | undefined,
  headers: SanitizedRequestHeaders,
  config: AppConfig,
  method = 'GET',
): Promise<APIGatewayProxyResultV2> {
  const requestHeaders: Record<string, string> = Object.entries(headers).reduce(
    (acc, [key, value]) => {
      acc[key] = value ?? '';
      return acc;
    },
    {},
  );

  const response = await sendHttpRequest({
    url: `https://${hostname}${path}`,
    httpRequest: {
      method,
      // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion
      body: body as string,
      headers: requestHeaders,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  // Convert fetch Response to APIGatewayProxyResultV2
  const responseBody = await response.text();

  // Convert Headers object to plain object for API Gateway
  const responseHeaders: Record<string, string> = Object.fromEntries(
    response.headers.entries(),
  );

  return {
    statusCode: response.status,
    body: responseBody,
    headers: responseHeaders,
  };
}

export const proxy = async ({
  method,
  path,
  parsedUrl,
  body,
  sanitizedHeaders,
  clientSecret,
  config,
}: ProxyInput): Promise<APIGatewayProxyResultV2> => {
  const encodedBodyWithClientSecret = querystring.stringify({
    ...body,
    client_secret: clientSecret,
  });

  return await _proxyRequest(
    parsedUrl.hostname,
    path,
    encodedBodyWithClientSecret,
    sanitizedHeaders,
    config,
    method,
  );
};

export interface ProxyInput {
  method: string;
  path: string;
  body: RequestBody;
  sanitizedHeaders: SanitizedRequestHeaders;
  parsedUrl: URL;
  clientSecret: string;
  config: AppConfig;
}
