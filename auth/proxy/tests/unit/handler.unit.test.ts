import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lambdaHandler } from '../../app'; // Adjust path as needed
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import https from "https";

vi.mock('https', () => {
    beforeEach(() => vi.resetAllMocks())

    const request = vi.fn((options, callback) => {
        const res = {
            on: (event: string, cb: any) => {
                if (event === 'data') cb('mock response');
                if (event === 'end') cb();
            },
            headers: { 'content-type': 'application/json' },
            statusCode: 200,
        };

        const req = {
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(() => callback(res)),
        };

        return req;
    });

    return {
        default: { request }, // default export for ESM-style import
        request,
    };
});

const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /token',
    rawPath: '/token',
    rawQueryString: '',
    headers: {
        'content-type': 'application/x-www-form-urlencoded',
        host: 'example.com',
    },
    requestContext: {
        accountId: '',
        apiId: '',
        domainName: '',
        domainPrefix: '',
        http: {
            method: 'POST',
            path: '/token',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent'
        },
        requestId: '',
        routeKey: 'POST /token',
        stage: '',
        time: '',
        timeEpoch: 0,
    },
    body: 'grant_type=authorization_code&code=testcode&redirect_uri=http%3A%2F%2Flocalhost%2Fcallback',
    isBase64Encoded: false,
    ...overrides,
});

describe('lambdaHandler', () => {
    beforeEach(() => {
        process.env.COGNITO_URL = 'https://mock.auth.region.amazoncognito.com';
    });

    it('proxies a valid GET /authorize request', async () => {
        const response = await lambdaHandler(createMockEvent({
            routeKey: 'GET /authorize'
        })) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });

    it('proxies a valid POST /token request', async () => {
        const response = await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });

    it('proxied requests have host stripped to avoid certificate name errors', async () => {
        const requestSpy = vi.spyOn(https, 'request');

        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;

        expect(requestSpy.mock.calls[0][0].headers['host']).toBeUndefined()
    });

    it('proxied requests headers are lowercased', async () => {
        const requestSpy = vi.spyOn(https, 'request');

        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        const headerKeys = Object.keys(requestSpy.mock.calls[0][0].headers);
        const hasUppercaseKeys = headerKeys.some(k => /[A-Z]/.test(k));
        
        expect(hasUppercaseKeys).toBe(false);
    });

    it('returns 500 on proxy error', async () => {
        // Replace the implementation temporarily
        vi.spyOn(https, 'request').mockImplementationOnce((options, callback) => {
            const req = {
                on: vi.fn(),
                write: vi.fn(),
                end: vi.fn(),
            };

            // the 'error' listener is attached after https.request() is called - gives proxy time to add an error to on 'error' callback
            setTimeout(() => {
                req.on.mock.calls
                    .filter(([event]) => event === 'error')
                    .forEach(([, handler]) => handler(new Error('Mocked failure')));
            }, 0);

            // No callback needed — we simulate error
            return req as any;
        });

        const brokenEvent = createMockEvent({ routeKey: '' });
        const response = await lambdaHandler(brokenEvent) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });

    it('returns 500 on catch-all errors', async () => {
        // Replace the implementation temporarily
        vi.spyOn(https, 'request').mockImplementationOnce((options, callback) => {
            throw new Error('generic error')
        });

        const response = await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });
});
