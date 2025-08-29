import { expect, describe, it, afterAll, beforeEach, vi, Mock } from 'vitest';
import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import * as secrets from '../../secret';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

vi.mock('aws-jwt-verify');
vi.mock('../../secret');

describe('Unit test for shared signal authorizer lambdaHandler', () => {
  const consoleMock = vi
    .spyOn(console, 'log')
    .mockImplementation(() => undefined);
  const consoleErrorMock = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    consoleMock.mockReset();
    consoleErrorMock.mockReset();
    vi.clearAllMocks();
    process.env.SHARED_SIGNAL_CLIENT_SECRET_NAME = 'secretsName'; //pragma: allowlist secret
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.SHARED_SIGNAL_CLIENT_SECRET_NAME;
  });

  const event: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    authorizationToken: 'Bearer mockToken',
    methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
  };

  it('Should return Allow policy for valid token', async () => {
    const secretsServiceSpy = vi.spyOn(secrets, 'getSecretObject');
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<
      typeof CognitoJwtVerifier
    >;

    secretsServiceSpy.mockResolvedValue({
      clientSecret: 'mockClientSecret', // pragma: allowlist-secret
      userPoolId: 'mockUserPoolId',
      clientId: 'mockClientId',
    });

    mockJwtVerifier.create.mockReturnValue({
      verify: vi.fn().mockResolvedValue({ sub: 'mockUserId' }),
    });

    const result = await lambdaHandler(event);

    expect(result).toEqual({
      principalId: 'mockUserId',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
    });
  });

  it('Should throw Unauthorized error for missing token', async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: '',
      methodArn:
        'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow(
      'Unauthorized - Token not supplied',
    );

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Authorization header missing',
    );
  });

  it('Should throw Unauthorized error for invalid token format', async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'InvalidTokenFormat',
      methodArn:
        'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Token format invalid: Not a Bearer token',
    );
  });

  it('Should throw Unauthorized error for token validation failure', async () => {
    const mockSecretsService = vi.spyOn(secrets, 'getSecretObject');
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<
      typeof CognitoJwtVerifier
    >;

    mockSecretsService.mockResolvedValue({
      clientSecret: 'mockClientSecret',
      userPoolId: 'mockUserPoolId',
      clientId: 'mockClientId',
    });

    mockJwtVerifier.create.mockReturnValue({
      verify: vi.fn().mockRejectedValue(new Error('Invalid token')),
    });

    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'Bearer mockToken',
      methodArn:
        'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');
  });

  it('Should throw error if secret retrieval fails', async () => {
    (secrets.getSecretObject as Mock).mockRejectedValue(
      new Error('Secrets Manager error'),
    );

    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'Bearer mockToken',
      methodArn:
        'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');
  });
});
