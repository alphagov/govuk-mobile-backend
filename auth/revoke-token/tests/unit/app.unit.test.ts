import { lambdaHandler } from '../../app';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if body is missing', async () => {
    const event = { body: null } as APIGatewayProxyEvent;
    const result = await lambdaHandler(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing request body');
  });

  it('returns 400 if body is empty string', async () => {
    const event = { body: '' } as APIGatewayProxyEvent;
    const result = await lambdaHandler(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing request body');
  });

  it('returns 400 if refresh_token is missing', async () => {
    const event = {
      body: 'client_id=testClientId',
    } as APIGatewayProxyEvent;
    const result = await lambdaHandler(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing refresh token');
  });

  it('returns 400 if client_id is missing', async () => {
    const event = {
      body: 'refresh_token=testRefreshToken',
    } as APIGatewayProxyEvent;
    const result = await lambdaHandler(event);
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

    const event = {
      body: 'refresh_token=testRefreshToken&client_id=testClientId&refresh_token=testRefreshToken2',
    } as APIGatewayProxyEvent;

    const result = await lambdaHandler(event);

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

    const event = {
      body: 'refresh_token=validRefreshToken&client_id=validClientId',
    } as APIGatewayProxyEvent;

    const result = await lambdaHandler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Token revoked');
  });
});
