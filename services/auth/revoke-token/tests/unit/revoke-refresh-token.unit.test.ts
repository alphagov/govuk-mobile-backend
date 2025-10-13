import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { revokeRefreshToken } from '../../revoke-refresh-token';
import type { RevokeTokenInput } from '../../types';

import {
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  TooManyRequestsException,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  AppError,
  InvalidParameterError,
  NotAuthorizedError,
  TooManyRequestsError,
} from '../../errors';

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
    expect(JSON.parse(result.body)).toEqual({ message: 'OK' });
  });

  it('should handle InvalidParameterException', async () => {
    mockSend.mockRejectedValueOnce(
      new InvalidParameterException({
        message: 'Internal error details - invalid parameter',
        $metadata: {},
      }),
    );
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      InvalidParameterError,
    );
  });

  it('should handle NotAuthorizedException', async () => {
    mockSend.mockRejectedValueOnce(
      new NotAuthorizedException({
        message: 'Internal error details - not authorized',
        $metadata: {},
      }),
    );
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      NotAuthorizedError,
    );
  });

  it('should handle TooManyRequestsException', async () => {
    mockSend.mockRejectedValueOnce(
      new TooManyRequestsException({
        message: 'Internal error details - too many requests',
        $metadata: {},
      }),
    );
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      TooManyRequestsError,
    );
  });

  it('should handle InternalErrorException', async () => {
    mockSend.mockRejectedValueOnce(new InternalErrorException({}));
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      AppError,
    );
  });

  it('should handle unknown error', async () => {
    mockSend.mockRejectedValueOnce(new Error('Unknown error'));
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      AppError,
    );
  });

  it('should handle non-Error unknown error', async () => {
    mockSend.mockRejectedValueOnce('some string error');
    await expect(revokeRefreshToken(input, mockCognitoClient)).rejects.toThrow(
      AppError,
    );
  });
});
