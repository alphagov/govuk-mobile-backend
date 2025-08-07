import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import {
  CognitoIdentityProviderClient,
  AdminUserGlobalSignOutCommand,
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UserNotFoundException,
  CognitoIdentityProviderServiceException,
} from '@aws-sdk/client-cognito-identity-provider';

import { adminGlobalSignOut } from '../../../cognito/sign-out-user';
import { CognitoError } from '../../../errors';

vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  process.env.REGION = 'eu-west-2';
  const actual = await vi.importActual<any>(
    '@aws-sdk/client-cognito-identity-provider',
  );
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn(),
    AdminUserGlobalSignOutCommand: vi.fn(),
  };
});

const sendMock = vi.fn();

describe('adminGlobalSignOut', () => {
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

  it('returns true when sign-out is successful (HTTP 200)', async () => {
    sendMock.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

    const result = await adminGlobalSignOut(userName);
    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(AdminUserGlobalSignOutCommand).toHaveBeenCalledWith({
      UserPoolId: process.env['USER_POOL_ID'],
      Username: userName,
    });
  });

  it('returns false when sign-out response is not 200', async () => {
    sendMock.mockResolvedValue({ $metadata: { httpStatusCode: 400 } });

    const result = await adminGlobalSignOut(userName);
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
      await expect(() => adminGlobalSignOut(userName)).rejects.toThrowError(
        CognitoError,
      );
    });
  });

  it('throws generic Error on unknown error type', async () => {
    sendMock.mockRejectedValue(new Error('Unhandled cognito exception'));
    await expect(() => adminGlobalSignOut(userName)).rejects.toThrow(
      'Unhandled cognito exception',
    );
  });
});
