/* eslint-disable sonarjs/pseudo-random */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { APIGatewayProxyEvent } from 'aws-lambda';
import querystring from 'querystring';
import { v4 } from 'uuid';

interface User {
    sub: string; // Unique identifier for the user
    email: string; // User's email address
    updated_at: number; // Timestamp of the last update (in seconds)
    email_verified: boolean; // Whether the user's email is verified
}


// eslint-disable-next-line @typescript-eslint/require-await
export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
    // Log the incoming event for debugging purposes
    console.log('OAuthMockProxyLambda called');

    const { path } = event;
    const { httpMethod } = event;

    // Helper function to return a standardized API Gateway proxy response
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const buildResponse = (statusCode: number, body: object, headers = {}) => {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
        };
    };

    // --- /authorize Endpoint (GET) ---
    if (path === '/authorize' && httpMethod === 'GET') {
        const queryStringParameters = event.queryStringParameters || {};
        const responseType = queryStringParameters['response_type'];
        const clientId = queryStringParameters['client_id'];
        const redirectUri = queryStringParameters['redirect_uri'];
        // const scope = queryStringParameters['scope'] || 'openid profile email';
        const state = queryStringParameters['state'] || 'mock-state';

        if (!responseType || !clientId || !redirectUri) {
            return buildResponse(400, {
                error: 'invalid_request',
                error_description: 'Missing required parameters: response_type, client_id, or redirect_uri',
            });
        }

        // Generate a more realistic mock authorization code (random 32-character hex string)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mockAuthCode = [...Array(32)]
             
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');

        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.append('code', mockAuthCode);
        if (state) {
            redirectUrl.searchParams.append('state', state);
        }

        // For a redirect, we set statusCode 302 and the Location header
        return {
            statusCode: 302,
            headers: {
                Location: redirectUrl.toString(),
                'Content-Type': 'text/html', // Standard for redirects
            },
            body: '', // Body can be empty for a redirect
        };
    }

    // --- /token Endpoint (POST) ---
    if (path === '/token' && httpMethod === 'POST') {
        let requestBody;
        try {
            // API Gateway can pass application/x-www-form-urlencoded as string body
            requestBody = querystring.parse(event.body);
        } catch (e) {
            console.error('Failed to parse token request body:', e);
            return buildResponse(400, {
                error: 'invalid_request',
                error_description: 'Could not parse request body.',
            });
        }

        const grantType = requestBody['grant_type'];
        const { code } = requestBody;
        // const redirectUri = requestBody['redirect_uri'];
        const clientId = requestBody['client_id'];
        const clientSecret = requestBody['client_secret'];

        if (grantType !== 'authorization_code' || !code || !clientId || !clientSecret) {
            return buildResponse(400, {
                error: 'invalid_request',
                error_description: 'Missing or invalid parameters for authorization_code grant type.',
            });
        }

        const accessToken = `mock-access-token-${Date.now()}`;
        const refreshToken = `mock-refresh-token-${Date.now()}`;
        const expiresIn = 3600; // 1 hour

        return buildResponse(200, {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
            refresh_token: refreshToken,
            scope: 'openid profile email',
        });
    }

    // --- /userinfo Endpoint (GET) ---
    if (path === '/userinfo' && httpMethod === 'GET') {
        const authorizationHeader = event.headers['Authorization'] || event.headers['authorization']; // Case-insensitive
        let accessToken = null;

        if (authorizationHeader?.startsWith('Bearer ')) {
            accessToken = authorizationHeader.substring(7);
        }

        if (!accessToken?.startsWith('mock-access-token-')) {
            return buildResponse(401, {
                error: 'invalid_token',
                error_description: 'The access token is missing or invalid.',
            }, {
                'WWW-Authenticate': 'Bearer error="invalid_token", error_description="The access token is missing or invalid."',
            });
        }

        // const randomUser = STATIC_USERS[Math.floor(Math.random() * STATIC_USERS.length)];
        const newUser: User = {
            sub: v4(),
            email: `perftest${v4()}@digital.cabinet-office.gov.uk`,
            updated_at: Math.floor(Date.now() / 1000),
            email_verified: true,
        }

        return buildResponse(200, newUser, {
            // Prevent caching of user info responses?
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache',
        });
    }

    const apiGatewayDomain = event.requestContext.domainName;
    const apiGatewayStage = event.requestContext.stage;
    const issuer = `https://${apiGatewayDomain}/${apiGatewayStage}`;
    if (path.endsWith('/.well-known/jwks.json') && httpMethod === 'GET') {
        const config = {
            issuer: issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            userinfo_endpoint: `${issuer}/userinfo`,
            // jwks_uri is for public keys used to verify ID Tokens.
            // For this simple mock, we'll provide a dummy URL.
            // A real OIDC provider would have actual keys here.
            jwks_uri: `${issuer}/.well-known/jwks.json`, // Placeholder JWKS URI
            response_types_supported: ["code"],
            scopes_supported: ["openid", "profile", "email"],
            subject_types_supported: ["public"],
            id_token_signing_alg_values_supported: ["RS256"], // Common algorithm
            // Other optional fields can be added as needed for more complete compliance
            // e.g., grant_types_supported, code_challenge_methods_supported, etc.
        };
        return buildResponse(200, config);
    }

    if (path.endsWith('/logout')) {
        return {
            statusCode: 200,
            body: '',
        };
    }

    // --- Fallback for unsupported paths/methods ---
    return buildResponse(404, {
        message: `Not Found: Path "${path}" with method "${httpMethod}" is not a recognized OAuth endpoint.`,
    });
};
