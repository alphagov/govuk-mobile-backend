import https from 'https';
import querystring from 'querystring';
import { APIGatewayProxyResultV2 } from 'aws-lambda';

export interface ProxyInput {
    method: string
    path: string
    isBase64Encoded: boolean
    body: string | undefined
    sanitizedHeaders: any
    targetPath: string
    parsedUrl: URL
}

export const proxy = async ({
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

        return await _proxyRequest(parsedUrl.hostname, targetPath, encodedBody, sanitizedHeaders, method);
    }
    return await _proxyRequest(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method);
}

async function _proxyRequest(hostname: string, path: string, body: any, headers: any, method = 'GET'): Promise<APIGatewayProxyResultV2> {
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

        try {
            if (method === 'POST' && body) {
                req.write(body);
            }
        } catch (e) {
            console.error('Error during req.write:', e);
            resolve({
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Internal server error' }),
            });
            return;
        }

        req.end();
    });
}