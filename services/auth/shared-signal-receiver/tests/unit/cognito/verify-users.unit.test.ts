import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyUsername } from '../../../cognito/verify-users';
import {
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '../../../cognito/client';
import { logger } from '../../../logger';

vi.mock('../../../cognito/client', () => ({
  cognitoClient: {
    send: vi.fn(),
  },
}));

const loggerErrorMock = vi
  .spyOn(logger, 'error')
  .mockImplementation(() => undefined);

const USER_POOL_ID = 'test-pool-id';

describe('verifyUserExists', () => {
  const input = 'test-user';

  beforeEach(() => {
    process.env['USER_POOL_ID'] = USER_POOL_ID;
    vi.clearAllMocks();
    loggerErrorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    loggerErrorMock.mockReset();
  });

  it('returns true when user exists', async () => {
    (cognitoClient.send as any).mockResolvedValueOnce({});
    const result = await verifyUsername(input);
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
    expect(result).toBe(true);
  });

  it('returns false when user does not exist', async () => {
    (cognitoClient.send as any).mockRejectedValueOnce(
      new UserNotFoundException({ $metadata: {}, message: 'User not found' }),
    );
    const result = await verifyUsername(input);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'User not found',
      expect.any(UserNotFoundException),
    );
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
    expect(result).toBe(false);
  });

  it('throws exceptions for all other errors', async () => {
    const error = new Error('Some other error');
    (cognitoClient.send as any).mockRejectedValueOnce(error);
    await expect(verifyUsername(input)).rejects.toThrow(
      new Error('Some other error'),
    );
    expect(cognitoClient.send).toHaveBeenCalledWith(
      expect.any(AdminGetUserCommand),
    );
  });

  it('uses correct UserPoolId and Username', async () => {
    (cognitoClient.send as any).mockResolvedValueOnce({});
    await verifyUsername(input);
    const command = (cognitoClient.send as any).mock.calls[0][0];
    expect(command.input.UserPoolId).toBe(USER_POOL_ID);
    expect(command.input.Username.includes(input)).toBeTruthy();
  });

  it('should prefix username with onelogin_', async () => {
    (cognitoClient.send as any).mockResolvedValueOnce({});
    await verifyUsername(input);
    const command = (cognitoClient.send as any).mock.calls[0][0];
    expect(command.input.Username).toBe(`onelogin_${input}`);
  });
});
