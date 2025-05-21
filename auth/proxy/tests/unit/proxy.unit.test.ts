import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import https from "https";
import { proxy, ProxyInput } from '../../proxy'

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
    isBase64Encoded: true,
    parsedUrl: new URL('https://app-dev.auth.eu-west-2.amazoncognito.com/token'),
    path: '/token',
    sanitizedHeaders: {
        'content-type': 'application/x-www-form-urlencoded',
        host: 'example.com',
        'X-Attestation-Token': 'test-token',
    },
    targetPath: '/token',
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

    it('should throw an error if the request body is undefined', async () => {
        const input = createMockInput({
            body: undefined,
            method: 'POST',
        })
        await expect(proxy(input)).rejects.toThrow('Request body is undefined');
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

        const brokenEvent = createMockInput({ path: '' });
        const response = await proxy(brokenEvent) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });
});
