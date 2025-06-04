import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { proxy, ProxyInput } from '../../proxy'
import EventEmitter from 'events';

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

const createMockInput = (overrides: Partial<ProxyInput> = {}): ProxyInput => ({
    method: 'POST',
    body: 'mock body',
    parsedUrl: new URL('https://app-dev.auth.eu-west-2.amazoncognito.com/token'),
    path: '/token',
    sanitizedHeaders: {
        'content-type': 'application/x-www-form-urlencoded',
        "x-attestation-token": 'test-token'
    },
    clientSecret: 'mock-client-secret', // pragma: allowlist secret
    ...overrides,
});

describe('proxy', () => {

    beforeEach(() => {
        process.env.COGNITO_URL = 'https://mock.auth.region.amazoncognito.com';
    });

    it('proxies a valid GET /authorize request', async () => {
        const response = await proxy(createMockInput({
            path: '/authorize'
        })) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });

    it('proxies a valid POST /token request', async () => {
        const response = await proxy(createMockInput()) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });


    it('returns 500 on proxy error', async () => {
        const genericProxyError = vi.fn((options, callback) => {
            const mockResponse = new EventEmitter() as any;
            mockResponse.statusCode = 200;
            mockResponse.headers = { 'content-type': 'application/json' };
            // Call response callback with our mockResponse
            setImmediate(() => {
                callback(mockResponse)
            });

            const req = new EventEmitter() as any;
            req.write = vi.fn();
            req.on = vi.fn();
            req.end = vi.fn();

            // the 'error' listener is attached after https.request() is called - gives proxy time to add an error to on 'error' callback
            setTimeout(() => {
                req.on.mock.calls
                    .filter(([event]) => event === 'error')
                    .forEach(([, handler]) => handler(new Error('Mocked failure')));
            }, 0);

            return req;
        });

        const brokenEvent = createMockInput({ path: '', requestFn: genericProxyError });
        const response = await proxy(brokenEvent) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });

    it('does not resolve more than once if both end and error events are emitted', async () => {
        const doubleResolutionRequest = vi.fn((options, callback) => {
            const mockResponse = new EventEmitter() as any;
            mockResponse.statusCode = 200;
            mockResponse.headers = { 'content-type': 'application/json' };
            // Call response callback with our mockResponse
            setImmediate(() => {
                callback(mockResponse)
            });

            const req = new EventEmitter() as any;
            req.write = vi.fn();
            req.end = () => {
                // Simulate normal data and end
                mockResponse.emit('data', '{"foo":"bar"}');
                mockResponse.emit('end');

                // Then simulate an error afterward
                req.emit('error', new Error('Simulated error'));
            };
            return req;
        });

        const response = await proxy(createMockInput({
            requestFn: doubleResolutionRequest
        })) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ "message": "Internal server error" });
        expect(doubleResolutionRequest).toHaveBeenCalledOnce();
    });
});
