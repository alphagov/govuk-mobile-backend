import { describe, it, expect, vi, beforeAll, Mock, afterAll } from 'vitest';
import {
  CredentialChangeRequest,
  handleCredentialChangeRequest,
} from '../../../handlers/credential-change-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { verifyUserExists } from '../../../cognito/verify-users';
import { adminGlobalSignOut } from '../../../cognito/sign-out-user';
import { adminUpdateEmailAddress } from '../../../cognito/update-email-address';

vi.mock('../../../cognito/sign-out-user', () => ({
  adminGlobalSignOut: vi.fn(),
}));

vi.mock('../../../cognito/update-email-address', () => ({
  adminUpdateEmailAddress: vi.fn(),
}));

vi.mock('../../../cognito/verify-users', () => ({
  verifyUserExists: vi.fn(),
}));

describe('handleCredentialChangeRequest', () => {
  const region = 'eu-west-2';

  const consoleErrorMock = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  const consoleInfoMock = vi
    .spyOn(console, 'info')
    .mockImplementation(() => undefined);

  const consoleWarnMock = vi
    .spyOn(console, 'warn')
    .mockImplementation(() => undefined);

  const verifyUserExistsMock = verifyUserExists as Mock;
  const adminGlobalSignOutMock = adminGlobalSignOut as Mock;
  const adminUpdateEmailAddressMock = adminUpdateEmailAddress as Mock;

  beforeAll(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
    };
    vi.clearAllMocks();
    consoleInfoMock.mockReset();
    consoleErrorMock.mockReset();
    consoleWarnMock.mockReset();
  });

  afterAll(() => {
    consoleInfoMock.mockRestore();
    consoleErrorMock.mockRestore();
    consoleWarnMock.mockRestore();
  });

  it('return ACCEPTED when User not found for password change', async () => {
    verifyUserExistsMock.mockResolvedValue(false);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'password',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'any@test.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);

    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );

    expect(verifyUserExists as Mock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );

    expect(consoleWarnMock).toHaveBeenCalledWith('SIGNAL_WARN_USER_NOT_FOUND', {
      userId: 'urn:example:account:1234567890',
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      requestType: 'UPDATE_PASSWORD',
    });

    expect(adminGlobalSignOutMock).not.toHaveBeenCalled();

    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.ACCEPTED,
    });

    verifyUserExistsMock.mockReset();
  });

  it('return ACCEPTED when User not found for email change', async () => {
    verifyUserExistsMock.mockResolvedValue(false);

    const adminGlobalSignOutMock = adminGlobalSignOut as Mock;

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'email',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'any@test.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);

    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );

    expect(verifyUserExistsMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(adminGlobalSignOutMock).not.toHaveBeenCalled();

    expect(consoleWarnMock).toHaveBeenCalledWith('SIGNAL_WARN_USER_NOT_FOUND', {
      userId: 'urn:example:account:1234567890',
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
      requestType: 'UPDATE_EMAIL_ADDRESS',
    });
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.ACCEPTED,
    });

    verifyUserExistsMock.mockReset();
  });

  it('returns ACCEPTED for password change events and logs success info message', async () => {
    verifyUserExistsMock.mockResolvedValue(true);
    adminGlobalSignOutMock.mockResolvedValue(true);
    adminUpdateEmailAddressMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'password',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'user@example.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(verifyUserExistsMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(adminGlobalSignOut).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(adminUpdateEmailAddress).not.toHaveBeenCalled();
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'SIGNAL_SUCCESS_PASSWORD_UPDATE',
      {
        userId: 'urn:example:account:1234567890',
        correlationId: input.jti,
      },
    );
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.ACCEPTED,
    });
    verifyUserExistsMock.mockReset();
    adminGlobalSignOutMock.mockReset();
    adminUpdateEmailAddressMock.mockReset();
  });

  it('returns ACCEPTED for email change events and logs success info message', async () => {
    verifyUserExistsMock.mockResolvedValue(true);
    adminGlobalSignOutMock.mockResolvedValue(true);
    adminUpdateEmailAddressMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'email',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'user@example.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);
    expect(verifyUserExistsMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(adminGlobalSignOut).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(adminUpdateEmailAddress).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
      'user@example.com',
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'SIGNAL_SUCCESS_EMAIL_UPDATE',
      {
        userId: 'urn:example:account:1234567890',
        correlationId: input.jti,
      },
    );
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.ACCEPTED,
    });

    verifyUserExistsMock.mockReset();
    adminGlobalSignOutMock.mockReset();
    adminUpdateEmailAddressMock.mockReset();
  });

  it('returns INTERNAL_SERVER_ERROR when adminGlobalSignOut & adminUpdateEmailAddress fails for an email update and logs error message', async () => {
    verifyUserExistsMock.mockResolvedValue(true);
    adminGlobalSignOutMock.mockResolvedValue(false);
    adminUpdateEmailAddressMock.mockResolvedValue(false);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'email',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'user@example.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(consoleErrorMock).toHaveBeenCalledWith('SIGNAL_ERROR_EMAIL_UPDATE', {
      userId: 'urn:example:account:1234567890',
      correlationId: input.jti,
    });
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    expect(verifyUserExistsMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );

    adminGlobalSignOutMock.mockReset();
    adminUpdateEmailAddressMock.mockReset();
    verifyUserExistsMock.mockReset();
  });

  it('returns INTERNAL_SERVER_ERROR when adminGlobalSignOut fails for a password update and logs error message', async () => {
    verifyUserExistsMock.mockResolvedValue(true);
    adminGlobalSignOutMock.mockResolvedValue(false);
    adminUpdateEmailAddressMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'update',
            credential_type: 'password',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'user@example.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);

    expect(verifyUserExistsMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'SIGNAL_ERROR_PASSWORD_UPDATE',
      {
        userId: 'urn:example:account:1234567890',
        correlationId: input.jti,
      },
    );
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });

    verifyUserExistsMock.mockReset();
    adminGlobalSignOutMock.mockReset();
    adminUpdateEmailAddressMock.mockReset();
  });

  it('returns INTERNAL_SERVER_ERROR for unknown change events and logs error message', async () => {
    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'delete', // change type not supported
            credential_type: 'email',
            subject: {
              uri: 'urn:example:account:1234567890',
              format: 'urn:example:format:account-id',
            },
          },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'user@example.com',
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);

    expect(verifyUserExists).not.toHaveBeenCalled();
    expect(adminGlobalSignOut).not.toHaveBeenCalled();
    expect(adminUpdateEmailAddress).not.toHaveBeenCalled();

    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'SIGNAL_ERROR_UNKNOWN_CHANGE_TYPE',
      {
        userId: 'urn:example:account:1234567890',
        correlationId: input.jti,
        changeType: 'delete',
      },
    );
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.BAD_REQUEST,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.BAD_REQUEST,
    });
  });

  it('returns INTERNAL_SERVER_ERROR for invalid requests and correlationId is logged', async () => {
    // Simulate an invalid request
    const request: any = {
      jti: '123e4567-e89b-12d3-a456-426614174000',
      events: {},
    } as any;

    const response = await handleCredentialChangeRequest(request);
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      '123e4567-e89b-12d3-a456-426614174000',
    );

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'SIGNAL_ERROR_CREDENTIAL_CHANGE CorrelationId - 123e4567-e89b-12d3-a456-426614174000',
      expect.any(Error),
    );

    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  });
});
