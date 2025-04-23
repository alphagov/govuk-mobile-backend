import { APIGatewayProxyResultV2, APIGatewayProxyEventV2, APIGatewayProxyEventHeaders } from 'aws-lambda';
import https from 'https';
import { MissingAttestationTokenError } from './errors';
import { FEATURE_FLAGS } from './feature-flags';
import querystring from 'querystring';

const ALLOWED_ENDPOINTS = [
  "authorize",
  "token",
  '/.well-known/openid-configuration'
]
const cognitoUrl = process.env.COGNITO_URL?.toLowerCase().replace('_', '') as string;

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * 
 * @param {APIGatewayProxyEventHeaders} headers 
 * @returns 
 * @throws {MissingAttestationTokenError} 
 */
const validateAttestationHeaderOrThrow = (headers: APIGatewayProxyEventHeaders, path: string): void => {
  if (!FEATURE_FLAGS.ATTESTATION) return

  const attestationToken = headers['x-attestation'] || headers['X-Attestation'];
  const isAuthorizeEndpoint = path.includes('/authorize');

  if (isAuthorizeEndpoint && !attestationToken) {
    throw new MissingAttestationTokenError('No attestation token header provided.')
  }
}

export const lambdaHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const { headers, body, requestContext, routeKey, rawQueryString } = event;
    const query = rawQueryString

    console.log('Calling auth proxy', event)

    const [method, path] = routeKey.split(' ')

    const isAllowedEndpoint = !ALLOWED_ENDPOINTS.includes(requestContext.http.path)

    if (!isAllowedEndpoint) {
      console.log('Invalid path')
      return {
        statusCode: 400,
        body: 'Invalid path',
      };
    }

    // validateAttestationHeaderOrThrow(headers, requestContext.http.path)

    const sanitizedHeaders: any = {}
    for (const [k, v] of Object.entries(headers)) {
      const key = k.toLowerCase();
      if ([
        'host',
      ].includes(key)) continue; // Remove potentially problematic headers
      sanitizedHeaders[key] = v || '';
    }

    const targetPath = path + (query ? `?${query}` : '');

    return await proxyWithHttps(method, path, event, body as string, sanitizedHeaders, targetPath, new URL(cognitoUrl))
  } catch (error) {
    console.error('Catchall error:', JSON.stringify(error));
    return {
      statusCode: 500,
      body: 'Server error',
    };
  }
};

const proxyWithHttps = async (method: string, path: string, event: APIGatewayProxyEventV2, body: string, sanitizedHeaders: any, targetPath: string, parsedUrl: URL) => {
  if (method === "POST" && path.includes('/token')) {
    // In API Gateway Proxy v2, if the request body is base64-encoded (e.g. from a frontend form or custom client), you need to handle decoding it manually.
    const rawBody = event.isBase64Encoded ? Buffer.from(body!, 'base64').toString('utf-8') : body!;
    const parsedBody = querystring.parse(rawBody);
    const encodedBody = querystring.stringify(parsedBody);

    sanitizedHeaders['content-length'] = Buffer.byteLength(encodedBody).toString();
    sanitizedHeaders['content-type'] = 'application/x-www-form-urlencoded'; // just to be safe

    return await proxy(parsedUrl.hostname, targetPath, encodedBody, sanitizedHeaders, method);
  }
  return await proxy(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method);
}

async function proxy(hostname: string, path: string, body: any, headers: any, method = 'GET'): Promise<APIGatewayProxyResultV2> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk
        });
        res.on('end', () => {
          const respHeaders: { [key: string]: string } = {};
          for (const [k, v] of Object.entries(res.headers)) {
            respHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v || '';
          }

          resolve({
            statusCode: res.statusCode || 500,
            headers: respHeaders,
            body: data 
          });
        });
      }
    );
    req.on('error', (e) => {
      console.error("Error proxying request to Cognito:", e);
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/x-amz-json-1.1' },
        body: JSON.stringify({ message: 'internal error' })
      });
    });
    
    if (method === 'POST' && body) {
      req.write(body);
    }

    console.log('Closing request')
    req.end();
  });
}
