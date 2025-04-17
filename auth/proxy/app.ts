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

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
const COGNITO_DOMAIN = 'https://eu-west-2pjplo3pev.auth.eu-west-2.amazoncognito.com/';
const CLIENT_ID = '607gcvhh7ih16b91qkvaf1aij7';

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

    validateAttestationHeaderOrThrow(headers, requestContext.http.path)

    const sanitizedHeaders: any = {}
    for (const [k, v] of Object.entries(event.headers)) {
      const key = k.toLowerCase();
      if ([
        'host',
      ].includes(key)) continue; // Remove potentially problematic headers
      sanitizedHeaders[key] = v || '';
    }

    const targetPath = path + (query ? `?${query}` : '');

    const parsedUrl = new URL(COGNITO_DOMAIN);

    // return await proxyWithFetch(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method)
    return await proxyWithHttps(method, path, event, body as string, sanitizedHeaders, targetPath, parsedUrl)
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

  console.log('--- Proxy Request Details ---');
  console.log('Method:', method);
  console.log('Target:', `${hostname}${path}`);
  console.log('Headers:', headers);
  console.log('Body:', body);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers,
        rejectUnauthorized: false,
        timeout: 10000, // 10 seconds timeout
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

          console.log('Response status:', res.statusCode);
          console.log('Headers:', res.headers);
          console.log('Body:', data);

          // Add Location header explicitly if it's a redirect
          if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
            if (res.headers['location']) {
              respHeaders['location'] = res.headers['location'];
            }
          }

          resolve({
            statusCode: res.statusCode || 500,
            headers: respHeaders,
            body: [301, 302, 303, 307, 308].includes(res.statusCode || 0) ? '' : data
          });
        });
      }
    );

    req.on('timeout', () => {
      console.error('Request timed out');
      req.destroy();
      resolve({
        statusCode: 504,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request timed out' })
      });
    });

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



async function proxyWithFetch(hostname: string, path: string, body: string | undefined, headers: any, method: string): Promise<APIGatewayProxyResultV2> {
  const url = `https://${hostname}${path}`;
  console.log(`Proxying with fetch to ${url} ${method}`);

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  });

  const resultHeaders: { [key: string]: string } = {};
  response.headers.forEach((value, key) => {
    resultHeaders[key.toLowerCase()] = value;
  });

  if (method === "POST" && path.includes('/token')) {
    console.log('Token endpoint')
    const json = await response.json();


    return {
      statusCode: response.status,
      headers: resultHeaders,
      body: JSON.stringify(json),
    };
  }

  const text = await response.text();

  return {
    statusCode: response.status,
    headers: resultHeaders,
    body: text,
  };
}