import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { proxy, ProxyInput } from '../../proxy'
import EventEmitter from 'events';

const createMockInput = (overrides: Partial<ProxyInput> = {}): ProxyInput => ({
    method: 'POST',
    body: 'mock body',
    isBase64Encoded: true,
    parsedUrl: new URL('https://mock.auth.region.amazoncognito.com/token'),
    path: '/token',
    sanitizedHeaders: {
        'content-type': 'application/x-www-form-urlencoded',
        host: 'example.com',
        'X-Attestation-Token': 'test-token',
    },
    targetPath: '/token',
    ...overrides,
});

describe('proxy', () => {
    const createMockRequestFn = () => vi.fn((options, callback) => {
        const mockResponse = new EventEmitter() as any;
        mockResponse.statusCode = 200;
        mockResponse.headers = { 'content-type': 'application/json' };
        // Call response callback with our mockResponse
        setImmediate(() => {
            callback(mockResponse)
        });

        const res = {
            on: (event: string, cb: any) => {
                if (event === 'data') cb('mock response');
                if (event === 'end') cb();
            },
            headers: { 'content-type': 'application/json' },
            statusCode: 200,
        };
        const req = new EventEmitter() as any;

        req.on = vi.fn()
        req.write = vi.fn()
        req.end = vi.fn(() => callback(res))

        return req;
    });


    beforeEach(() => {
        process.env.COGNITO_URL = 'https://mock.auth.region.amazoncognito.com';
    });

    it('proxies a valid GET /authorize request', async () => {
        const response = await proxy(createMockInput({
            path: '/authorize',
            requestFn: createMockRequestFn(),
        })) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });

    it('proxies a valid POST /token request', async () => {
        const response = await proxy(createMockInput({
            requestFn: createMockRequestFn(),
        })) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('mock response');
    });

    it('does not resolve more than once if both end and error events are emitted', async () => {
        // there's a potential subtle bug: resolve might be called more than once if both an 'error' and 'end' event fire 
        // on the response. This test ensures that we only resolve once.

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
});
