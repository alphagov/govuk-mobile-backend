import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandler } from '../../app'; // Adjust path as needed
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import {
  transformCognitoURL,
  stripStageFromPath,
} from "../../services";

vi.mock("../../services", async(importOriginal) => {
  return {
    ...await importOriginal<typeof import('../../services')>(),
    transformCognitoURL: vi.fn().mockImplementation((url: string | undefined) => url),
    stripStageFromPath: vi.fn().mockImplementation((stage: string, path: string) => path),
  }
});

const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /token',
    rawPath: '/token',
    rawQueryString: '',
    headers: {
        'content-type': 'application/x-www-form-urlencoded',
        host: 'example.com',
        'X-Attestation-Token': 'test-token',
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

    const mockProxy = vi.fn().mockResolvedValue({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: 'mock response',
    })

    const mockDependencies = {
        attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(),
        },
        proxy: mockProxy,
        featureFlags: {
            ATTESTATION: true,
        }
    }

    const createMockDependencies = (overrides: Partial<typeof mockDependencies> = {}) => ({
        ...mockDependencies,
        ...overrides,
    });

    const proxy500Event = createHandler(createMockDependencies({
        proxy: vi.fn(() => {
            throw new Error('Generic transient error');
        }),
    }))

    const disableAttestationEvent = createHandler(createMockDependencies({
        featureFlags: {
            ATTESTATION: false,
        },
    }))
    
    const uncaughtExceptionEvent = createHandler(createMockDependencies({
        attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
            throw new Error('Generic transient error');
        })},
    }))

    const lambdaHandler = createHandler(mockDependencies);

    beforeEach(() => {
        vi.clearAllMocks();
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
        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;

        expect(mockProxy.mock.calls[0][0].sanitizedHeaders['host']).toBeUndefined();
    });

    it('proxied requests headers are lowercased', async () => {
        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        const headerKeys = Object.keys(mockProxy.mock.calls[0][0].sanitizedHeaders);
        const hasUppercaseKeys = headerKeys.some(k => /[A-Z]/.test(k));
        
        expect(hasUppercaseKeys).toBe(false);
    });

    it('should not perform an attestation check if the feature flag is enabled', async () => {
        await disableAttestationEvent(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        expect(mockDependencies.attestationUseCase.validateAttestationHeaderOrThrow)
            .not
            .toHaveBeenCalled();        
    });

    it('returns 500 on proxy error', async () => {
        const response = await proxy500Event(createMockEvent()) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });

    it('returns 500 on catch-all errors', async () => {
        const response = await uncaughtExceptionEvent(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });
});
