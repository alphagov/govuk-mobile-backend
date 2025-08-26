import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { revokeRefreshToken } from '../../revoke-refresh-token';
import type { RevokeTokenInput } from '../../types';

import {
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  TooManyRequestsException,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const mockSend = vi.fn();

const mockCognitoClient = {
  send: mockSend,
} as unknown as CognitoIdentityProviderClient;

const input: RevokeTokenInput = {
  ClientId: 'client-id',
  Token: 'refresh-token',
  ClientSecret: 'client-secret', // pragma: allowlist secret
};

describe('revokeRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should revoke token successfully', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(mockSend).toHaveBeenCalledWith(expect.any(RevokeTokenCommand));
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('Refresh token revoked successfully.');
  });

  it('should handle InvalidParameterException', async () => {
    mockSend.mockRejectedValueOnce(new InvalidParameterException({}));
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Invalid parameters');
  });

  it('should handle NotAuthorizedException', async () => {
    mockSend.mockRejectedValueOnce(new NotAuthorizedException({}));
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Not authorized');
  });

  it('should handle TooManyRequestsException', async () => {
    mockSend.mockRejectedValueOnce(new TooManyRequestsException({}));
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Too many requests');
  });

  it('should handle InternalErrorException', async () => {
    mockSend.mockRejectedValueOnce(new InternalErrorException({}));
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('internal error');
  });

  it('should handle unknown error', async () => {
    mockSend.mockRejectedValueOnce(new Error('Unknown error'));
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Failed to revoke token.');
    expect(JSON.parse(result.body).errorDetails).toBe('Unknown error');
  });

  it('should handle non-Error unknown error', async () => {
    mockSend.mockRejectedValueOnce('some string error');
    const result = await revokeRefreshToken(input, mockCognitoClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).errorDetails).toBe('some string error');
  });
});
