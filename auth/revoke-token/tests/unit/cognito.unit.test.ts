import { describe, it, expect, vi, beforeEach } from 'vitest';

import { retrieveCognitoCredentials } from '../../cognito';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';

vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  return {
    CognitoIdentityProviderClient: vi.fn(),
    DescribeUserPoolClientCommand: vi.fn(),
  };
});

const mockSend = vi.fn();

const mockCognitoIdentityProviderClient = {
  send: mockSend,
} as unknown as CognitoIdentityProviderClient;

const config = {
  userPoolId: 'test-user-pool-id',
  clientId: 'test-client-id',
};

describe('retrieveCognitoCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error if userPoolId is missing', async () => {
    await expect(
      retrieveCognitoCredentials(
        { userPoolId: '', clientId: 'test-client-id' },
        mockCognitoIdentityProviderClient,
      ),
    ).rejects.toThrow('Missing required environment variables: USER_POOL_ID');
  });

  it('throws error if Cognito Client ID is missing in response', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: {
        ClientId: undefined,
        ClientSecret: 'secret', // pragma: allowlist secret
      },
    });
    await expect(
      retrieveCognitoCredentials(config, mockCognitoIdentityProviderClient),
    ).rejects.toThrow('Could not retrieve Cognito Client ID');
  });

  it('throws error if Cognito Client Secret is missing in response', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: {
        ClientId: 'client-id',
        ClientSecret: undefined,
      },
    });
    await expect(
      retrieveCognitoCredentials(config, mockCognitoIdentityProviderClient),
    ).rejects.toThrow('Could not retrieve Cognito Client Secret');
  });

  it('returns credentials if both ClientId and ClientSecret are present', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: {
        ClientId: 'client-id',
        ClientSecret: 'client-secret', // pragma: allowlist secret
      },
    });
    const creds = await retrieveCognitoCredentials(
      config,
      mockCognitoIdentityProviderClient,
    );
    expect(creds).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret', // pragma: allowlist secret
    });
  });

  it('rethrows error from send', async () => {
    const error = new Error('AWS error');
    mockSend.mockRejectedValue(error);
    await expect(
      retrieveCognitoCredentials(config, mockCognitoIdentityProviderClient),
    ).rejects.toThrow('AWS error');
  });

  it('calls DescribeUserPoolClientCommand with correct params', async () => {
    mockSend.mockResolvedValue({
      UserPoolClient: {
        ClientId: 'client-id',
        ClientSecret: 'client-secret', // pragma: allowlist secret
      },
    });
    await retrieveCognitoCredentials(config, mockCognitoIdentityProviderClient);
    expect(DescribeUserPoolClientCommand).toHaveBeenCalledWith({
      ClientId: config.clientId,
      UserPoolId: config.userPoolId,
    });
  });
});
