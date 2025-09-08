import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authorizerResult } from '../../../client/authorizer-client';

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import {
  CognitoJwtVerifier,
  mockPayload,
} from '../../__mocks__/aws-jwt-verify';

vi.mock('aws-jwt-verify', () => {
  return import('../../__mocks__/aws-jwt-verify');
});

const mockSecrets = {
  clientId: 'test-client-id',
  userPoolId: 'test-user-pool-id',
  bearerToken: 'test-bearer-token',
};

vi.mock('@aws-lambda-powertools/parameters/secrets');

const baseEvent: APIGatewayRequestAuthorizerEvent = {
  type: 'REQUEST',
  methodArn: 'arn:aws:execute-api:region:account-id:api-id/stage/verb/resource',
  resource: '/test',
  path: '/test',
  httpMethod: 'GET',
  headers: { Authorization: 'Bearer jwt-token' },
  queryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  multiValueHeaders: null,
  multiValueQueryStringParameters: null,
};

describe('authorizerResult', () => {
  beforeEach(() => {
    process.env['REGION'] = 'eu-west-2';
    process.env['CHAT_SECRET_NAME'] = 'test-chat-secret-name'; //pragma: allowlist secret
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return Allow authorizer result when token and secrets are valid', async () => {
    const event = {
      ...baseEvent,
      headers: { Authorization: 'Bearer valid-token' },
    };
    const result = await authorizerResult(
      event.headers.Authorization,
      mockSecrets,
    );
    expect(result).toMatchObject({
      principalId: 'user-123',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
      context: {
        bearerToken: `Bearer ${mockSecrets.bearerToken}`,
        'Govuk-Chat-End-User-Id': 'user-123',
      },
    });
  });

  it('should return Deny authorizer result if Authorization header Bearer token is empty', async () => {
    const event = { ...baseEvent, headers: { Authorization: 'Bearer ' } };
    const result = await authorizerResult(
      event.headers.Authorization,
      mockSecrets,
    );
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should return Deny authorizer result if Cognito token payload is undefined', async () => {
    const event = { ...baseEvent, headers: { Authorization: 'Bearer ' } };
    const result = await authorizerResult(
      event.headers.Authorization,
      mockSecrets,
    );
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('returns Allow when valid jwt tokens are valid', async () => {
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<
      typeof CognitoJwtVerifier
    >;
    mockJwtVerifier.create.mockReturnValue({
      verify: vi.fn().mockResolvedValue(mockPayload),
    });

    const payload = await authorizerResult('Bearer valid-token', mockSecrets);
    expect(payload.policyDocument.Statement[0].Effect).toBe('Allow');
  });

  it('invalid jwt tokens return undefined', async () => {
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<
      typeof CognitoJwtVerifier
    >;
    mockJwtVerifier.create.mockReturnValue({
      verify: vi.fn().mockRejectedValue(new Error('Invalid token')),
    });

    const payload = await authorizerResult('Bearer bad-token', mockSecrets);
    expect(payload.policyDocument.Statement[0].Effect).toBe('Deny');
  });
});
