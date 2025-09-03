import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHandler } from '../../handler'; // Adjust path as needed
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { FailedToFetchSecretError, UnknownAppError } from '../../errors';
import querystring from 'querystring';
import { logMessages } from '../../log-messages';
import { logger } from '../../logger';

const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent => ({
  path: '/dev/oauth2/token',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    'X-Attestation-Token': 'test-token',
  },
  requestContext: {
    accountId: '',
    apiId: '',
    domainName: '',
    domainPrefix: '',
    requestId: '',
    routeKey: 'POST /token',
    stage: '',
    time: '',
    timeEpoch: 0,
  } as any,
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
        throw new FailedToFetchSecretError('Unable to get client secret');
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

  it('rejects all requests to non-token endpoint', async () => {
    const response = (await lambdaHandler(
      createMockEvent({
        path: '/dev/oauth2/authorize',
      }),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ message: 'Not Found' });
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

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body as string)).toEqual({
      message: 'Internal server error',
    });
  });

  it.each([
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new JsonWebTokenError('err');
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
              throw new UnknownAppError('err');
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

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body as string)).toEqual({
      message: 'Internal server error',
    });
  });

  it('should return an internal server error if no client secret is found', async () => {
    const response = (await unableToGetClientSecret(
      createMockEvent(),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(500);
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
        body: undefined,
      }),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: 'Invalid Request' });
  });

  it.each([
    [
      {
        'x-attestation-token': '𝓣𝓮𝓼𝓽',
      },
      {
        status: 400,
        body: { message: 'Invalid Request' },
      },
    ],
    [
      {
        'x-attestation-token': 'valid',
        'content-type': 'text/javascript;',
      },
      {
        status: 400,
        body: { message: 'Invalid Request' },
      },
    ],
  ])(
    'should throw an error if the request headers are invalid',
    async (headers, expectedResponse) => {
      const response = (await lambdaHandler(
        createMockEvent({
          headers: {
            ...createMockEvent().headers,
            ...headers,
          },
        }),
        mockContext,
      )) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(expectedResponse.status);
      expect(JSON.parse(response.body)).toEqual(expectedResponse.body);
    },
  );

  it.each([
    '',
    undefined,
    querystring.stringify({
      missing_all_fields: true,
    }),
  ])('should throw an error if the request body is invalid', async (body) => {
    const response = (await lambdaHandler(
      createMockEvent({
        body,
      }),
      mockContext,
    )) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ message: 'Invalid Request' });
  });

  it.each([
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new JsonWebTokenError('err');
            }),
          },
        }),
      ),
    ],
    [
      createHandler(
        createMockDependencies({
          attestationUseCase: {
            validateAttestationHeaderOrThrow: vi.fn(() => {
              throw new UnknownAppError('err');
            }),
          },
        }),
      ),
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
    ],
  ])(
    'attestation errors should have a consistent log prefix to enable log filtering',
    async (handler) => {
      (await handler(
        createMockEvent(),
        mockContext,
      )) as APIGatewayProxyStructuredResultV2;

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = consoleErrorSpy.mock.calls[0][0];
      expect(errorMessage).contains('ERROR_ATTESTATION_');
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
});
