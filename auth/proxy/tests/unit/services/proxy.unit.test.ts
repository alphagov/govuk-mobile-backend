import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import https from "https";
import { proxy, ProxyInput } from '../../../services';

vi.mock("https");

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
});
