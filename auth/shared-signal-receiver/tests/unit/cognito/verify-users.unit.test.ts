import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyUserExists } from '../../../cognito/verify-users';
import {
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '../../../cognito/client';
import { CognitoError } from '../../../errors';

vi.mock('../../../cognito/client', () => ({
  cognitoClient: {
    send: vi.fn(),
  },
}));

const consoleErrorMock = vi
  .spyOn(console, 'error')
  .mockImplementation(() => undefined);

const USER_POOL_ID = 'test-pool-id';

describe('verifyUserExists', () => {
  const input = 'test-user';

  beforeEach(() => {
    process.env['USER_POOL_ID'] = USER_POOL_ID;
    vi.clearAllMocks();
  });

  it('returns true when user exists', async () => {
    (cognitoClient.send as any).mockResolvedValueOnce({});
    const result = await verifyUserExists(input);
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
    expect(result).toBe(true);
  });

  it('returns false when user does not exist', async () => {
    (cognitoClient.send as any).mockRejectedValueOnce(
      new UserNotFoundException({ $metadata: {}, message: 'User not found' }),
    );
    const result = await verifyUserExists(input);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'User not found',
      expect.any(UserNotFoundException),
    );
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
    expect(result).toBe(false);
  });

  it('throws CognitoError for other exceptions', async () => {
    const error = new Error('Some other error');
    (cognitoClient.send as any).mockRejectedValueOnce(error);
    await expect(verifyUserExists(input)).rejects.toThrow(
      new CognitoError('Failed to verify user existence'),
    );
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Error other than UserNotFoundException:',
      error,
    );
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
  });

  it('uses correct UserPoolId and Username', async () => {
    (cognitoClient.send as any).mockResolvedValueOnce({});
    await verifyUserExists(input);
    const command = (cognitoClient.send as any).mock.calls[0][0];
    expect(command.input.UserPoolId).toBe(USER_POOL_ID);
    expect(command.input.Username).toBe(input);
  });
});
