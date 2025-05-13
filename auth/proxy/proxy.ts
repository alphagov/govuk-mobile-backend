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

const sessionStore: { [state: string]: { cookies: string[] } } = {};

export const proxy = async ({
    method,
    path,
    parsedUrl,
    isBase64Encoded,
    body,
    sanitizedHeaders,
    targetPath,
}: ProxyInput) => {
    console.log('Inputs',
        method,
        path,
        parsedUrl,
        isBase64Encoded,
        body,
        sanitizedHeaders,
        targetPath
    );

    const code = targetPath.split('?')[1]?.split('&').find((param) => param.startsWith('code='))?.split('=')[1];
    const state = targetPath.split('?')[1]?.split('&').find((param) => param.startsWith('state='))?.split('=')[1];

    // Step 1: Handle /authorize → store cookies
    if (method === 'GET' && path.includes('/authorize')) {
        console.log('Managing /authorize request');
        const res = await _proxyRequest(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method);
        console.log('Response from authorize:', res);
        const setCookies = res.cookies || [];
        if (state && setCookies.length) {
            sessionStore[state] = { cookies: setCookies };
            console.log(`Stored cookies for state: ${state}`);
        }

        return res;
    }

    // Step 2: Handle /idpresponse → replay cookies to Cognito
    if (method === 'GET' && path.includes('/idpresponse')) {
        console.log('Managing /idpresponse request');
        if (!code || !state) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Missing code or state' })
            };
        }

        const session = sessionStore[state];
        if (!session || !session.cookies) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'No session found for state' })
            };
        }

        const idpresponsePath = `${parsedUrl.pathname}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const headersWithCookies = {
            ...sanitizedHeaders,
            cookie: session.cookies.join('; ')
        };

        console.log('🔁 Replaying cookies to /idpresponse for state:', state);
        const res = await _proxyRequest(parsedUrl.hostname, idpresponsePath, body, headersWithCookies, 'GET');

        const location = res.headers?.location || '';
        if (res.statusCode === 302 && location.startsWith('govuk://')) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: `<h1>Login Complete</h1><p>You may now return to the GOVUK app manually.</p>`
            };
        }

        return res;
    }

    if (method === "POST" && path.includes('/token')) {
        const rawBody = isBase64Encoded ? Buffer.from(body!, 'base64').toString('utf-8') : body!;
        const parsedBody = querystring.parse(rawBody);
        const encodedBody = querystring.stringify(parsedBody);

        sanitizedHeaders['content-length'] = Buffer.byteLength(encodedBody).toString();
        sanitizedHeaders['content-type'] = 'application/x-www-form-urlencoded'

        return await _proxyRequest(parsedUrl.hostname, targetPath, encodedBody, sanitizedHeaders, method);
    }
    return await _proxyRequest(parsedUrl.hostname, targetPath, body, sanitizedHeaders, method);
};

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
                    data += chunk;
                });
                res.on('end', () => {
                    const respHeaders: { [key: string]: string } = {};
                    for (const [k, v] of Object.entries(res.headers)) {
                        respHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v || '';
                    }
                    console.log('Returning Cookies:', res.headers['set-cookie']);

                    resolve({
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