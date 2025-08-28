import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UserNotFoundException,
  CognitoIdentityProviderServiceException,
} from '@aws-sdk/client-cognito-identity-provider';

import { adminDeleteUser } from '../../../cognito/delete-user';
import { CognitoError } from '../../../errors';

vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  process.env.REGION = 'eu-west-2';
  const actual = await vi.importActual<any>(
    '@aws-sdk/client-cognito-identity-provider',
  );
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn(),
    AdminDeleteUserCommand: vi.fn(),
  };
});

const sendMock = vi.fn();

describe('adminDeleteUser', () => {
  const userName = 'test-user';
  const region = 'eu-west-2';

  beforeAll(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
    };
    (
      CognitoIdentityProviderClient as unknown as { prototype: any }
    ).prototype.send = sendMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when delete-user is successful (HTTP 200)', async () => {
    sendMock.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

    const result = await adminDeleteUser(userName);
    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(AdminDeleteUserCommand).toHaveBeenCalledWith({
      UserPoolId: process.env['USER_POOL_ID'],
      Username: `onelogin_${userName}`,
    });
  });

  it('returns false when delete-user response is not 200', async () => {
    sendMock.mockResolvedValue({ $metadata: { httpStatusCode: 400 } });

    const result = await adminDeleteUser(userName);
    expect(result).toBe(false);
  });

  const errorCases = [
    {
      error: new InternalErrorException({
        message: 'Internal error',
        $metadata: {},
      }),
      name: 'InternalErrorException',
    },
    {
      error: new InvalidParameterException({
        message: 'Invalid parameter',
        $metadata: {},
      }),
      name: 'InvalidParameterException',
    },
    {
      error: new NotAuthorizedException({
        message: 'Not authorized',
        $metadata: {},
      }),
      name: 'NotAuthorizedException',
    },
    {
      error: new ResourceNotFoundException({
        message: 'Resource not found',
        $metadata: {},
      }),
      name: 'ResourceNotFoundException',
    },
    {
      error: new TooManyRequestsException({
        message: 'Too many requests',
        $metadata: {},
      }),
      name: 'TooManyRequestsException',
    },
    {
      error: new UserNotFoundException({
        message: 'User not found',
        $metadata: {},
      }),
      name: 'UserNotFoundException',
    },
    {
      error: new CognitoIdentityProviderServiceException({
        name: 'CognitoIdentityProviderServiceException',
        message: 'Generic service error',
        $fault: 'client',
        $metadata: {},
      }),
      name: 'CognitoIdentityProviderServiceException',
    },
  ];

  errorCases.forEach(({ error, name }) => {
    it(`throws CognitoError on ${name}`, async () => {
      sendMock.mockRejectedValue(error);
      await expect(() => adminDeleteUser(userName)).rejects.toThrowError(
        CognitoError,
      );
    });
  });

  it('throws generic Error on unknown error type', async () => {
    sendMock.mockRejectedValue(new Error('Unhandled cognito exception'));
    await expect(() => adminDeleteUser(userName)).rejects.toThrow(
      'Unhandled cognito exception',
    );
  });

  it('should prefix username with onelogin_', async () => {
    sendMock.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

    await adminDeleteUser(userName);
    expect(AdminDeleteUserCommand).toHaveBeenCalledWith({
      UserPoolId: process.env['USER_POOL_ID'],
      Username: `onelogin_${userName}`,
    });
  });

  it('throws an exception when no user pool id is set', async () => {
    delete process.env['USER_POOL_ID'];
    await expect(() => adminDeleteUser(userName)).rejects.toThrow(
      'USER_POOL_ID environment variable is not set',
    );
  });
});
