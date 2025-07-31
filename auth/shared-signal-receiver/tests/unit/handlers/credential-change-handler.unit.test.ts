import { describe, it, expect, vi, beforeAll, Mock, afterAll } from 'vitest';

import {
  CredentialChangeRequest,
  handleCredentialChangeRequest,
} from '../../../handlers/credential-change-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

vi.mock('../../../cognito/sign-out-user', () => ({
  adminGlobalSignOut: vi.fn(),
}));

vi.mock('../../../cognito/update-email-address', () => ({
  adminUpdateEmailAddress: vi.fn(),
}));

import { adminGlobalSignOut } from '../../../cognito/sign-out-user';
import { adminUpdateEmailAddress } from '../../../cognito/update-email-address';

describe('handleCredentialChangeRequest', () => {
  const region = 'eu-west-2';

  const consoleErrorMock = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  const consoleInfoMock = vi
    .spyOn(console, 'info')
    .mockImplementation(() => undefined);

  beforeAll(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
    };
    vi.clearAllMocks();
    consoleInfoMock.mockReset();
    consoleErrorMock.mockReset();
  });

  afterAll(() => {
    consoleInfoMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  it('returns ACCEPTED for password change events and logs success info message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    (adminUpdateEmailAddress as Mock).mockResolvedValue(true);
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
    expect(adminGlobalSignOut).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );
    expect(adminUpdateEmailAddress).not.toHaveBeenCalled();
    expect(consoleInfoMock).toHaveBeenCalledWith(
      'SIGNAL_SUCCESS_PASSWORD_UPDATE',
      {
        userId: 'urn:example:account:1234567890',
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
  });

  it('returns ACCEPTED for email change events and logs success info message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    (adminUpdateEmailAddress as Mock).mockResolvedValue(true);
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
  });

  it('returns INTERNAL_SERVER_ERROR when adminGlobalSignOut & adminUpdateEmailAddress fails for an email update and logs error message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(false);
    (adminUpdateEmailAddress as Mock).mockResolvedValue(false);
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
  });

  it('returns INTERNAL_SERVER_ERROR when adminGlobalSignOut fails for a password update and logs error message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(false);
    (adminUpdateEmailAddress as Mock).mockResolvedValue(true);
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
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'SIGNAL_ERROR_PASSWORD_UPDATE',
      {
        userId: 'urn:example:account:1234567890',
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
  });

  it('returns INTERNAL_SERVER_ERROR for unknown change events and logs error message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    (adminUpdateEmailAddress as Mock).mockResolvedValue(true);
    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'delete',
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
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Unhandled credential change type',
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
