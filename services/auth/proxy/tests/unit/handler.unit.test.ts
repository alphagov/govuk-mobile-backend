import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHandler } from '../../handler'; // Adjust path as needed
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { TokenExpiredError } from 'jsonwebtoken';
import {
  FailedToFetchSecretError,
  JwtError,
  UnknownAppError,
} from '../../errors';
import { logMessages } from '../../log-messages';
import { logger } from '../../logger';
import querystring from 'querystring';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent => ({
  path: '/dev/oauth2/token',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Attestation-Token': 'test-token',
  },
  requestContext: {
    path: '/dev/oauth2/token',
    identity: {
      sourceIp: '127.0.0.1',
      accessKey: '',
      accountId: '',
      apiKey: '',
      apiKeyId: '',
      caller: '',
      clientCert: {
        clientCertPem: '',
        serialNumber: '',
        subjectDN: '',
        issuerDN: '',
        validity: { notAfter: '', notBefore: '' },
      },
      cognitoAuthenticationProvider: '',
      cognitoAuthenticationType: '',
      cognitoIdentityId: '',
      cognitoIdentityPoolId: '',
      principalOrgId: '',
      user: '',
      userAgent: '',
      userArn: '',
    },
    protocol: 'HTTP/1.1',
    accountId: '123456789012',
    apiId: '1234',
    domainName: 'foo',
    domainPrefix: '',
    requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
    routeKey: 'POST /token',
    requestTime: '12/Jun/2025:15:00:06 +0000',
    stage: 'dev',
    requestTimeEpoch: 1749740406669,
    resourcePath: '/dev/oauth2/token',
    httpMethod: 'POST',
    resourceId: '123456',
  },
  body: querystring.stringify({
    grant_type: 'authorization_code',
    client_id: 'jsfalkgjojn',
    redirect_uri: 'govuk://govuk/login-auth-callback',
    code: 'sag36=-ga9sg0uioga',
    code_verifier: 'abcd1234',
    scope: 'openid email',
  }),
  isBase64Encoded: false,
  httpMethod: 'POST',
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
  pathParameters: {},
  queryStringParameters: {},
  resource: '',
  stageVariables: {},
  ...overrides,
});

describe('lambdaHandler', () => {
  let consoleErrorSpy: vi.SpyInstance;
  let consoleSpy: vi.SpyInstance;

  const mockProxy = vi.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: 'mock response',
  });

  const mockContext = {
    awsRequestId: 'foobar',
  } as Context;

  const mockDependencies = {
    attestationUseCase: {
      validateAttestationHeaderOrThrow: vi.fn(),
    },
    proxy: mockProxy,
    featureFlags: {
      ATTESTATION: vi.fn().mockReturnValue(true),
    },
    getClientSecret: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      cognitoUrl: 'foobar',
    }),
  };

  const createMockDependencies = (
    overrides: Partial<typeof mockDependencies> = {},
  ) => ({
    ...mockDependencies,
    ...overrides,
  });

  const proxy500Event = createHandler(
    createMockDependencies({
      proxy: vi.fn(() => {
        throw new Error('Generic transient error');
      }),
    }),
  );

  const disableAttestationEvent = createHandler(
    createMockDependencies({
      featureFlags: {
        ATTESTATION: vi.fn(() => {
          return false;
        }),
      },
    }),
  );

  const uncaughtExceptionEvent = createHandler(
    createMockDependencies({
      attestationUseCase: {
        validateAttestationHeaderOrThrow: vi.fn(() => {
          throw new Error('Generic transient error');
        }),
      },
    }),
  );

  const unableToGetClientSecret = createHandler(
    createMockDependencies({
      getClientSecret: vi.fn(() => {
        throw new FailedToFetchSecretError();
      }),
    }),
  );

  const lambdaHandler = createHandler(mockDependencies);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.COGNITO_URL = 'https://mock.auth.region.amazoncognito.com';
    consoleErrorSpy = vi.spyOn(logger, 'error');
    consoleSpy = vi.spyOn(logger, 'info');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('proxies a valid POST /token request', async () => {
    const response = (await lambdaHandler(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('mock response');
  });

  it('proxied requests have host stripped to avoid certificate name errors', async () => {
    (await lambdaHandler(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(mockProxy.mock.calls[0][0].sanitizedHeaders['host']).toBeUndefined();
  });

  it('proxied requests headers are lowercased', async () => {
    (await lambdaHandler(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;
    const headerKeys = Object.keys(mockProxy.mock.calls[0][0].sanitizedHeaders);
    const hasUppercaseKeys = headerKeys.some((k) => /[A-Z]/.test(k));

    expect(hasUppercaseKeys).toBe(false);
  });

  it('should not perform an attestation check if the feature flag is enabled', async () => {
    (await disableAttestationEvent(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;
    expect(
      mockDependencies.attestationUseCase.validateAttestationHeaderOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('returns 500 on proxy error', async () => {
    const response = (await proxy500Event(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body as string)).toEqual({
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    });
  });

  it.each([
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new JwtError('Attestation token is invalid');
            }),
          },
        }),
      ),
      {
        statusCode: 401,
        message: 'Attestation token is invalid',
      },
    ],
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new UnknownAppError();
            }),
          },
        }),
      ),
      {
        statusCode: 401,
        message: 'Unknown app associated with attestation token',
      },
    ],
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new TokenExpiredError('err', new Date());
            }),
          },
        }),
      ),
      {
        statusCode: 401,
        message: 'Attestation token has expired',
      },
    ],
  ])(
    'returns correct response on attestation token errors',
    async (handler, expectedResponse) => {
      const response = (await handler(
        createMockEvent(),
        mockContext,
      )) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(expectedResponse.statusCode);
      expect(JSON.parse(response.body as string).message).toEqual(
        expectedResponse.message,
      );
    },
  );

  it('returns 500 on catch-all errors', async () => {
    const response = (await uncaughtExceptionEvent(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body as string)).toEqual({
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    });
  });

  it('should return an internal server error if no client secret is found', async () => {
    const response = (await unableToGetClientSecret(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body as string)).toEqual({
      message: 'Internal server error, server missing key dependencies',
    });
  });

  it('should set path name to oauth token endpoint', async () => {
    (await lambdaHandler(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(mockProxy.mock.calls[0][0].path).toBe('/oauth2/token');
  });

  it('should throw an error if the request body is undefined', async () => {
    const response = (await lambdaHandler(
      createMockEvent({
        body: '',
      }),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: 'Bad Request' });
  });

  it.each([
    [
      {
        'x-attestation-token': '𝓣𝓮𝓼𝓽',
      },
      {
        status: 400,
        body: { message: 'Bad Request' },
      },
    ],
    [
      {
        'x-attestation-token': 'valid',
        'Content-Type': 'text/javascript;',
      },
      {
        status: 400,
        body: { message: 'Bad Request' },
      },
    ],
  ])(
    'should throw an error if the request headers are invalid',
    async (headers, expectedResponse) => {
      const response = (await lambdaHandler(
        createMockEvent({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-attestation-token': 'test-token',
            ...headers,
          },
        }),
        mockContext,
      )) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(expectedResponse.status);
      expect(JSON.parse(response.body)).toEqual(expectedResponse.body);
    },
  );

  it.each(['', 'missing_all_fields=true'])(
    'should throw an error if the request body is invalid',
    async (body) => {
      const response = (await lambdaHandler(
        createMockEvent({
          body,
        }),
        mockContext,
      )) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ message: 'Bad Request' });
    },
  );

  it('should add a attestation start and end log message', async () => {
    (await lambdaHandler(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(logMessages.ATTESTATION_STARTED),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(logMessages.ATTESTATION_COMPLETED),
    );
  });

  it('logs a warning via middleware on Cognito 4xx responses', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');

    const handlerWith4xx = createHandler(
      createMockDependencies({
        proxy: vi.fn().mockResolvedValue({
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            error: 'invalid_request',
            error_description: 'bad',
          }),
        }),
      }),
    );

    const response = (await handlerWith4xx(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(400);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, details] = warnSpy.mock.calls[0];
    expect(message).toBe('COGNITO_ERROR');
    expect(details).toMatchObject({ statusCode: 400 });

    warnSpy.mockRestore();
  });
});
