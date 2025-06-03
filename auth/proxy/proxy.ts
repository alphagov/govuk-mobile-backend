import https from 'https';
import querystring from 'querystring';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { SanitizedRequestHeaders } from './sanitize-headers';

/**
 * Proxies an HTTP request to the specified hostname and path using HTTPS.
 * @param hostname - The target server's hostname.
 * @param path - The request path on the target server.
 * @param body - The request body as a string, or undefined if not applicable.
 * @param headers - The HTTP headers to send with the request.
 * @param method - The HTTP method to use (default is 'GET').
 * @returns A promise that resolves to an APIGatewayProxyResultV2 containing the response.
 */
async function _proxyRequest(hostname: string, path: string, body: string | undefined, headers: SanitizedRequestHeaders, method = 'GET'): Promise<APIGatewayProxyResultV2> {
    // eslint-disable-next-line promise/avoid-new
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
                res.on('data', (chunk: string) => {
                    data += chunk
                });
                res.on('end', () => {
                    const respHeaders: Record<string, string> = {};
                    for (const [k, v] of Object.entries(res.headers)) {
                        respHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v ?? '';
                    }

                    const internalServerError = 500;

                    resolve({
                        statusCode: res.statusCode ?? internalServerError,
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

        if (method === 'POST' && (body != null)) {
            req.write(body);
        }

        req.end();
    });
}

export const proxy = async ({
    method,
    path,
    parsedUrl,
    body,
    sanitizedHeaders,
    clientSecret,
}: ProxyInput): Promise<APIGatewayProxyResultV2> => {
    const parsedBody = querystring.parse(body);
    const encodedBody = querystring.stringify({
        ...parsedBody,
        client_secret: clientSecret,
    });

    return await _proxyRequest(parsedUrl.hostname, path, encodedBody, sanitizedHeaders, method);
}

export interface ProxyInput {
    method: string
    path: string
    body: string
    sanitizedHeaders: SanitizedRequestHeaders
    parsedUrl: URL
    clientSecret: string
}
