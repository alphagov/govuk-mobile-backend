import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CognitoIdentityProviderClient,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { revokeRefreshToken } from '../../revoke-refresh-token';
import { RevokeTokenInput } from '../../types';

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  return {
    CognitoIdentityProviderClient: vi.fn(),
    RevokeTokenCommand: vi.fn(),
  };
});

const mockSend = vi.fn();

const mockClient = {
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
    (RevokeTokenCommand as unknown as vi.Mock).mockImplementation((args) => ({
      ...args,
    }));
  });

  it('should return 200 on successful revoke', async () => {
    mockSend.mockResolvedValueOnce({});
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(result.body).message).toBe(
      'Refresh token revoked successfully.',
    );
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining(input));
  });

  it('should handle InvalidParameterException', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'InvalidParameterException',
      message: 'Invalid params',
    });
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain(
      'Invalid parameters provided',
    );
    expect(JSON.parse(result.body).errorDetails).toBe('Invalid params');
  });

  it('should handle NotAuthorizedException', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'NotAuthorizedException',
      message: 'Not authorized',
    });
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain(
      'Not authorized to revoke this token',
    );
    expect(JSON.parse(result.body).errorDetails).toBe('Not authorized');
  });

  it('should handle TooManyRequestsException', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'TooManyRequestsException',
      message: 'Rate limit',
    });
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Too many requests');
    expect(JSON.parse(result.body).errorDetails).toBe('Rate limit');
  });

  it('should handle InternalErrorException', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'InternalErrorException',
      message: 'Internal error',
    });
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain(
      'An internal error occurred',
    );
    expect(JSON.parse(result.body).errorDetails).toBe('Internal error');
  });

  it('should handle unknown errors', async () => {
    mockSend.mockRejectedValueOnce({
      name: 'UnknownError',
      message: 'Something went wrong',
    });
    const result = await revokeRefreshToken(input, mockClient);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Failed to revoke token.');
    expect(JSON.parse(result.body).errorDetails).toBe('Something went wrong');
  });
});
