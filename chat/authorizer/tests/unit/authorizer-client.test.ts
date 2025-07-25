import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthorizerClient } from '../../client/authorizer-client';

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { mockPayload } from '../__mocks__/aws-jwt-verify';

const getSecretMock = vi.fn();
vi.mock('../../services/secrets-service', () => ({
  SecretsService: vi.fn().mockImplementation(() => ({
    getSecret: getSecretMock,
  })),
}));

vi.mock('aws-jwt-verify', () => {
  return import('../__mocks__/aws-jwt-verify');
});

const mockSecrets = {
  clientId: 'test-client-id',
  userPoolId: 'test-user-pool-id',
  bearerToken: 'test-bearer-token',
};

const baseEvent: APIGatewayRequestAuthorizerEvent = {
  type: 'REQUEST',
  methodArn: 'arn:aws:execute-api:region:account-id:api-id/stage/verb/resource',
  resource: '/test',
  path: '/test',
  httpMethod: 'GET',
  headers: { 'X-Auth': 'jwt-token' },
  queryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  multiValueHeaders: null,
  multiValueQueryStringParameters: null,
};

describe('AuthorizerClient', () => {
  let client: AuthorizerClient;
  let secretsServiceMock: any;

  beforeEach(() => {
    process.env['REGION'] = 'eu-west-2';
    process.env['CHAT_SECRET_NAME'] = 'test-chat-secret-name'; //pragma: allowlist secret
    secretsServiceMock = {
      getSecret: getSecretMock,
    };
    getSecretMock.mockResolvedValue(mockSecrets);
    secretsServiceMock.getSecret.mockResolvedValue(mockSecrets);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return Allow authorizer result when token and secrets are valid', async () => {
    const event = { ...baseEvent, headers: { 'X-Auth': 'valid-token' } };
    client = new AuthorizerClient(event);
    const result = await client.authorizerResult();
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

  it('should return Deny authorizer result if X-Auth header is missing', async () => {
    const event = { ...baseEvent, headers: {} };
    client = new AuthorizerClient(event);
    client['secretsService'] = secretsServiceMock;
    const result = await client.authorizerResult();
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should return Deny authorizer result if Cognito token payload is undefined', async () => {
    const event = { ...baseEvent, headers: { 'X-Auth': undefined } };
    client = new AuthorizerClient(event);
    client['secretsService'] = secretsServiceMock;
    const result = await client.authorizerResult();
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('getCognitoTokenPayloadFromJwt returns payload when valid', async () => {
    const event = { ...baseEvent, headers: { 'X-Auth': 'bad-token' } };
    client = new AuthorizerClient(event);
    client['secretsService'] = secretsServiceMock;
    const payload = await AuthorizerClient.getCognitoTokenPayloadFromJwt(
      'valid-token',
      mockSecrets.userPoolId,
      mockSecrets.clientId,
    );
    expect(payload).toEqual(mockPayload);
  });

  it('getCognitoTokenPayloadFromJwt returns undefined when invalid', async () => {
    const payload = await AuthorizerClient.getCognitoTokenPayloadFromJwt(
      'bad-token',
      mockSecrets.userPoolId,
      mockSecrets.clientId,
    );
    expect(payload).toBeUndefined();
  });

  it('getChatSecrets returns secrets config when valid', async () => {
    const event = { ...baseEvent, headers: { 'X-Auth': 'bad-token' } };
    client = new AuthorizerClient(event);
    client['secretsService'] = secretsServiceMock;
    const secrets = await client.getChatSecrets();
    expect(secrets).toEqual(mockSecrets);
  });

  it('getChatSecrets logs error if CHAT_SECRET_NAME is not set', async () => {
    process.env['CHAT_SECRET_NAME'] = '';
    client = new AuthorizerClient(baseEvent);
    client['secretsService'] = secretsServiceMock;

    await expect(client.getChatSecrets()).rejects.toThrow(
      `Environment variable "CHAT_SECRET_NAME" is not set`,
    );
  });

  it('getChatSecrets logs error if getSecret returns undefined', async () => {
    secretsServiceMock.getSecret.mockResolvedValueOnce(undefined);
    client = new AuthorizerClient(baseEvent);
    client['secretsService'] = secretsServiceMock;
    await expect(client.getChatSecrets()).rejects.toThrow(
      'Failed to retrieve chat secret from Secrets Manager',
    );
  });

  it('getChatSecrets logs error if getSecret returns a string', async () => {
    secretsServiceMock.getSecret.mockResolvedValueOnce('string-secret');
    client = new AuthorizerClient(baseEvent);
    client['secretsService'] = secretsServiceMock;
    await expect(client.getChatSecrets()).rejects.toThrow(
      'Retrieved secret is a string, expected an object with bearerToken, clientId, and userPoolId',
    );
  });
});
