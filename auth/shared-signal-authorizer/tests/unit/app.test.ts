import { expect, describe, it, afterAll, beforeEach, vi } from 'vitest';
import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { SecretsService } from '../../service/secrets-service';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

vi.mock('../../../m2m-authorizer/service/secrets-service');
vi.mock('aws-jwt-verify');

describe('Unit test for m2m-authorizer lambdaHandler', () => {
  const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    consoleMock.mockReset();
    consoleErrorMock.mockReset();
    vi.clearAllMocks();
    process.env.SHARED_SIGNAL_CLIENT_SECRET_NAME = 'secretsName';
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.SHARED_SIGNAL_CLIENT_SECRET_NAME;
  });

  it('Should return Allow policy for valid token', async () => {
    const mockSecretsService = SecretsService as vi.MockedClass<typeof SecretsService>;
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<typeof CognitoJwtVerifier>;

    mockSecretsService.prototype.getSecret.mockResolvedValue({
      clientSecret: 'mockClientSecret',
      userPoolId: 'mockUserPoolId',
      clientId: 'mockClientId',
    });

    mockJwtVerifier.create.mockReturnValue({
      verify: vi.fn().mockResolvedValue({ sub: 'mockUserId' }),
    });

    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'Bearer mockToken',
      methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

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

    expect(consoleMock).toHaveBeenCalledWith('Authorizer event:', JSON.stringify(event, null, 2));
    expect(consoleMock).toHaveBeenCalledWith('Retrieved JWT secret:', {
      clientSecret: 'mockClientSecret',
      userPoolId: 'mockUserPoolId',
      clientId: 'mockClientId',
    });
    expect(consoleMock).toHaveBeenCalledWith('Token successfully validated:', { sub: 'mockUserId' });
  });

  it('Should throw Unauthorized error for missing token', async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: '',
      methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized - Token not supplied');

    expect(consoleErrorMock).toHaveBeenCalledWith('Authorization header missing');
  });

  it('Should throw Unauthorized error for invalid token format', async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'InvalidTokenFormat',
      methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');

    expect(consoleErrorMock).toHaveBeenCalledWith('Token format invalid: Not a Bearer token');
  });

  it('Should throw Unauthorized error for token validation failure', async () => {
    const mockSecretsService = SecretsService as vi.MockedClass<typeof SecretsService>;
    const mockJwtVerifier = CognitoJwtVerifier as vi.Mocked<typeof CognitoJwtVerifier>;

    mockSecretsService.prototype.getSecret.mockResolvedValue({
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
      methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');

    expect(consoleErrorMock).toHaveBeenCalledWith('Token verification failed:', 'Invalid token');
  });

  it('Should throw error if secret retrieval fails', async () => {
    const mockSecretsService = SecretsService as vi.MockedClass<typeof SecretsService>;

    mockSecretsService.prototype.getSecret.mockRejectedValue(new Error('Secrets Manager error'));

    const event: APIGatewayTokenAuthorizerEvent = {
      type: 'TOKEN',
      authorizationToken: 'Bearer mockToken',
      methodArn: 'arn:aws:execute-api:region:accountId:apiId/stage/GET/resource',
    };

    await expect(lambdaHandler(event)).rejects.toThrow('Unauthorized');

    expect(consoleErrorMock).toHaveBeenCalledWith('Token validation failed:', expect.any(Error));
  });
});
