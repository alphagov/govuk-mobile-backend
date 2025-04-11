import { APIGatewayProxyResultV2, APIGatewayProxyEventV2, APIGatewayProxyEventHeaders } from 'aws-lambda';
import https from 'https';
import querystring from 'querystring';

const ALLOWED_ENDPOINTS = [
  "authorize",
  "token",
  '/.well-known/openid-configuration'
]

const rejectUnauthorisedEndpoints = (path: string) => {
  const isAllowedEndpoint = !ALLOWED_ENDPOINTS.includes(path)

  if (!isAllowedEndpoint) {
    throw new Error('Endpoint is not whitelisted.')
  }
}

// cognito expects consistent casing for header names e.g. x-amz-target
// host must be removed to avoid ssl hostname unrecognised errors
const sanitizeHeaders = (headers: APIGatewayProxyEventHeaders) => {
  return Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== 'host')
    .reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value || '';
      return acc;
    }, {});
}

const transformCognitoUrl = (url: string | undefined) => {
  return url?.toLowerCase().replace('_', '')
}

export const lambdaHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const cognitoUrl = transformCognitoUrl(process.env.COGNITO_URL);

    if (!cognitoUrl) {
      throw new Error('Missing Cognito URL parameter')
    }

    const { headers, body, routeKey, rawQueryString } = event;

    console.log('Calling auth proxy')

    const [method, path] = routeKey.split(' ')

    // rejectUnauthorisedEndpoints(requestContext.http.path)
    // validateAttestationHeaderOrThrow(headers, requestContext.http.path)

    const targetPath = path + (rawQueryString ? `?${rawQueryString}` : '');

    return await proxyWithHttps({
      method,
      path,
      isBase64Encoded: event.isBase64Encoded,
      body,
      sanitizedHeaders: sanitizeHeaders(headers),
      targetPath,
      // can throw invalid URL
      parsedUrl: new URL(cognitoUrl)
    })
  } catch (error) {
    console.error('Catchall error:', JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/x-amz-json-1.1' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

interface ProxyInput {
  method: string
  path: string
  isBase64Encoded: boolean
  body: string | undefined
  sanitizedHeaders: any
  targetPath: string
  parsedUrl: URL
}

const proxyWithHttps = async ({
  method,
  path,
  parsedUrl,
  isBase64Encoded,
  body,
  sanitizedHeaders,
  targetPath,
}: ProxyInput) => {
  if (method === "POST" && path.includes('/token')) {
    // In API Gateway Proxy v2, if the request body is base64-encoded (e.g. from a frontend form or custom client), you need to handle decoding it manually.
    const rawBody = isBase64Encoded ? Buffer.from(body!, 'base64').toString('utf-8') : body!;
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
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    if (method === 'POST' && body) {
      req.write(body);
    }

    req.end();
  });
}
