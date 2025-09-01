import { lambdaHandler } from '../../app';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import * as cognitoModule from '../../../revoke-token/cognito';
import * as revokeModule from '../../../revoke-token/revoke-refresh-token';

vi.mock('@aws-sdk/client-cognito-identity-provider');
vi.mock('../../../revoke-token/cognito');
vi.mock('../../../revoke-token/revoke-refresh-token');

describe('lambdaHandler - revoke-token', () => {
  const mockRetrieveCognitoCredentials =
    cognitoModule.retrieveCognitoCredentials as unknown as vi.Mock;
  const mockRevokeRefreshToken =
    revokeModule.revokeRefreshToken as unknown as vi.Mock;

  const mockContext = {
    awsRequestId: 'foobar',
  } as Context;

  const createMockEvent = (overrides?: any): APIGatewayProxyEvent => ({
    body: 'refresh_token=testRefreshToken&client_id=testClientId&refresh_token=testRefreshToken2',
    requestContext: {
      requestId: 'foo',
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if body is missing', async () => {
    const event = createMockEvent({ body: null });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing request body');
  });

  it('returns 400 if body is empty string', async () => {
    const event = createMockEvent({ body: '' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing request body');
  });

  it('returns 400 if refresh_token is missing', async () => {
    const event = createMockEvent({ body: 'client_id=testClientId' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing refresh token');
  });

  it('returns 400 if client_id is missing', async () => {
    const event = createMockEvent({ body: 'refresh_token=testRefreshToken' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing client ID');
  });

  it('handles array values for refresh_token and client_id', async () => {
    mockRetrieveCognitoCredentials.mockResolvedValue({
      clientId: 'resolvedClientId',
      clientSecret: 'resolvedClientSecret', // pragma: allowlist secret
    });
    mockRevokeRefreshToken.mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Success' }),
    });

    const event = createMockEvent();

    const result = await lambdaHandler(event, mockContext);

    expect(mockRetrieveCognitoCredentials).toHaveBeenCalledWith(
      { clientId: 'testClientId' },
      expect.any(CognitoIdentityProviderClient),
    );
    expect(mockRevokeRefreshToken).toHaveBeenCalledWith(
      {
        Token: 'testRefreshToken',
        ClientId: 'resolvedClientId',
        ClientSecret: 'resolvedClientSecret', // pragma: allowlist secret
      },
      expect.any(CognitoIdentityProviderClient),
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Success');
  });

  it('returns result from revokeRefreshToken', async () => {
    mockRetrieveCognitoCredentials.mockResolvedValue({
      clientId: 'resolvedClientId',
      clientSecret: 'resolvedClientSecret', // pragma: allowlist secret
    });
    mockRevokeRefreshToken.mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Token revoked' }),
    });

    const event = createMockEvent({
      body: 'refresh_token=validRefreshToken&client_id=validClientId',
    });

    const result = await lambdaHandler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Token revoked');
  });
});
