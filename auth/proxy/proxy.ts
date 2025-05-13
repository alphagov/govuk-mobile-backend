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
    requestFn?: typeof https.request
}

export const proxy = async ({
    method,
    path,
    parsedUrl,
    isBase64Encoded,
    body,
    sanitizedHeaders,
    targetPath,
    requestFn = https.request
}: ProxyInput) => {
    if (method === "POST" && path.includes('/token')) {
        // In API Gateway Proxy v2, if the request body is base64-encoded (e.g. from a frontend form or custom client), you need to handle decoding it manually.
        const rawBody = isBase64Encoded ? Buffer.from(body!, 'base64').toString('utf-8') : body!;
        const parsedBody = querystring.parse(rawBody);
        const encodedBody = querystring.stringify(parsedBody);

        sanitizedHeaders['content-length'] = Buffer.byteLength(encodedBody).toString();
        sanitizedHeaders['content-type'] = 'application/x-www-form-urlencoded'; // just to be safe

        return await _proxyRequest(parsedUrl.hostname, targetPath, encodedBody, sanitizedHeaders, method, requestFn);
    }
    return await _proxyRequest(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method, requestFn);
}

async function _proxyRequest(
    hostname: string, 
    path: string, 
    body: any, 
    headers: any, 
    method = 'GET',
    requestFn: typeof https.request = https.request
): Promise<APIGatewayProxyResultV2> {
    return new Promise((resolve) => {
        let resolved = false;
        const safeResolve = (value: APIGatewayProxyResultV2) => {
            if (!resolved) {
                resolved = true;
                resolve(value);
            }
        };

        const req = requestFn(
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

                    safeResolve({
                        statusCode: res.statusCode || 500,
                        headers: respHeaders,
                        body: data,
                        cookies: Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : undefined,
                    });
                });
            }
        );

        req.on('error', (e) => {
            console.error("Error proxying request to Cognito:", e);
            safeResolve({
                statusCode: 500,
                headers: { 'Content-Type': 'application/x-amz-json-1.1' },
                body: JSON.stringify({ message: 'Internal server error' })
            });
        });

        if (method === 'POST' && body) {
            req.write(body);
        }

        // req.setTimeout(10000, () => {
        //     console.error("Request to Cognito timed out");
        //     safeResolve({
        //         statusCode: 500,
        //         headers: { 'Content-Type': 'application/x-amz-json-1.1' },
        //         body: JSON.stringify({ message: 'Internal server error' })
        //     });
        //     req.destroy();
        // });

        req.end();
    });
}