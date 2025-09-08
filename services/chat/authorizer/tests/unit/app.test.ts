import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler } from '../../app';
import { APIGatewayRequestAuthorizerEvent, Context } from 'aws-lambda';

const mockContext = {
  awsRequestId: 'foobar',
} as Context;

const mockSecrets = {
  clientId: 'valid-client-id',
  userPoolId: 'valid-user-pool-id',
  bearerToken: 'valid-bearer-token',
};

vi.mock('@middy/secrets-manager', async () => {
  // Provide a no-op middleware that injects secrets into context

  const mockMiddleware = () => ({
    // middy v5 lifecycle hook
    before: async (request: any) => {
      request.context = { ...(request.context ?? {}), secrets: mockSecrets };
    },
  });

  return {
    __esModule: true,
    default: mockMiddleware,
    secret: vi.fn().mockResolvedValue({
      secrets: {
        clientId: 'valid-client-id',
        userPoolId: 'valid-user-pool-id',
        bearerToken: 'valid-bearer-token',
      },
    }),
  };
});

const baseEvent = {
  type: 'REQUEST',
  methodArn: 'arn:aws:execute-api:region:account-id:api-id/stage/verb/resource',
  resource: '/test',
  path: '/test',
  httpMethod: 'GET',
  requestContext: {
    accountId: '123456789012',
    apiId: '1234',
    stage: 'dev',
    protocol: 'HTTP/1.1',
    identity: {
      sourceIp: '127.0.0.1',
      user: 'user-123',
      caller: 'caller-123',
      userAgent: 'userAgent-123',
      userArn: 'userArn-123',
    },
    deploymentId: '1234',
    requestTime: '12/Jun/2025:15:00:06 +0000',
    requestTimeEpoch: 1749740406669,
    resourcePath: '/test',
    httpMethod: 'GET',
    path: '/test',
    requestId: '1234',
  },
  multiValueHeaders: {
    Authorization: ['Bearer valid-token'],
  },
  multiValueQueryStringParameters: {
    '': ['valid-token'],
  },
  stageVariables: {
    '': 'valid-token',
  },
  pathParameters: {
    '': 'valid-token',
  },
  queryStringParameters: {
    '': 'valid-token',
  },
};

const generateMockEvent = (
  overrides: Partial<APIGatewayRequestAuthorizerEvent>,
) => {
  return {
    ...baseEvent,
    ...overrides,
  } as APIGatewayRequestAuthorizerEvent;
};

describe('app', () => {
  const mockAuthorizerResult = vi.fn().mockResolvedValue({
    policyDocument: {
      Statement: [{ Effect: 'Deny' }],
    },
  });

  const lambdaHandler = createHandler({
    authorizerResult: mockAuthorizerResult,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a 401 status code when the Authorization header is missing', async () => {
    const event = generateMockEvent({
      headers: {
        Authorization: '',
      },
    });
    const result = await lambdaHandler(event, mockContext);
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should return a 403 status code when the Authorization header is invalid', async () => {
    const event = generateMockEvent({
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    const result = await lambdaHandler(event, mockContext);
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it.each([
    { header: 'Bearer valid-token' },
    { header: 'Bearer invalid-token' },
    { header: 'Bearer ' },
    { header: 'Bearer' },
    { header: 'Bear' },
  ])('should validate the Authorization header', async ({ header }) => {
    const event = generateMockEvent({
      headers: {
        Authorization: header,
      },
    });
    await expect(lambdaHandler(event, mockContext)).resolves.toEqual({
      policyDocument: {
        Statement: [{ Effect: 'Deny' }],
      },
    });
  });

  it('should expose secrets in the context', async () => {
    const event = generateMockEvent({
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    await lambdaHandler(event, mockContext);

    expect(mockAuthorizerResult).toHaveBeenCalledWith(
      event.headers.Authorization,
      mockSecrets,
    );
  });
});
