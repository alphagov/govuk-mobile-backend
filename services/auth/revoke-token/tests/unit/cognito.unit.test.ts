import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retrieveCognitoCredentials } from '../../cognito';
import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../../logger';

const mockSend = vi.fn();

const mockCognitoClient = {
  send: mockSend,
} as unknown as CognitoIdentityProviderClient;

const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret'; // pragma: allowlist secret
const USER_POOL_ID = 'test-user-pool-id';

describe('retrieveCognitoCredentials', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['USER_POOL_ID'] = USER_POOL_ID;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('throws error if USER_POOL_ID is missing', async () => {
    process.env['USER_POOL_ID'] = '';
    await expect(
      retrieveCognitoCredentials({ clientId: CLIENT_ID }, mockCognitoClient),
    ).rejects.toThrow('Missing required environment variables: USER_POOL_ID');
  });

  it('throws error if send returns undefined ClientId', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: { ClientId: '', ClientSecret: CLIENT_SECRET },
    });
    await expect(
      retrieveCognitoCredentials({ clientId: CLIENT_ID }, mockCognitoClient),
    ).rejects.toThrow('Could not retrieve Cognito Client ID');
  });

  it('throws error if send returns undefined ClientSecret', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: { ClientId: CLIENT_ID, ClientSecret: '' },
    });
    await expect(
      retrieveCognitoCredentials({ clientId: CLIENT_ID }, mockCognitoClient),
    ).rejects.toThrow('Could not retrieve Cognito Client Secret');
  });

  it('returns credentials if send returns valid ClientId and ClientSecret', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: { ClientId: CLIENT_ID, ClientSecret: CLIENT_SECRET },
    });
    const creds = await retrieveCognitoCredentials(
      { clientId: CLIENT_ID },
      mockCognitoClient,
    );
    expect(creds).toEqual({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  });

  it('throws and logs error if send throws', async () => {
    const error = new Error('AWS error');
    mockSend.mockRejectedValue(error);
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    await expect(
      retrieveCognitoCredentials({ clientId: CLIENT_ID }, mockCognitoClient),
    ).rejects.toThrow(error);
    expect(spy).toHaveBeenCalledWith(
      'Error fetching Cognito client credentials',
      error,
    );
    spy.mockRestore();
  });
});
