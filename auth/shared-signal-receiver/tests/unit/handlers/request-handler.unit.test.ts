import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { requestHandler } from '../../../handlers/request-handler';
import { handleCredentialChangeRequest } from '../../../handlers/credential-change-handler';
import { handleAccountPurgedRequest } from '../../../handlers/account-purged-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { verifyUsername } from '../../../cognito/verify-users';
import { CognitoError } from '../../../errors';
import { logMessages } from '../../../log-messages';

// Mocks
vi.mock('../../../parser', () => ({
  parseRequest: vi.fn(),
}));
vi.mock('../../../handlers/credential-change-handler', () => ({
  handleCredentialChangeRequest: vi.fn(),
}));
vi.mock('../../../handlers/account-purged-handler', () => ({
  handleAccountPurgedRequest: vi.fn(),
}));
vi.mock('../../../cognito/verify-users', () => ({
  verifyUsername: vi.fn(),
}));

describe('requestHandler', () => {
  const region = 'eu-west-2';

  beforeEach(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
      ENABLE_SHARED_SIGNAL: 'true',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches credentialChangeSchema to handleCredentialChangeRequest', async () => {
    const verifyUsernameMock = verifyUsername as Mock;
    verifyUsernameMock.mockResolvedValue(true);

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
    };

    (handleCredentialChangeRequest as any).mockReturnValue({
      statusCode: StatusCodes.ACCEPTED,
      body: ReasonPhrases.ACCEPTED,
    });
    const result = await requestHandler(input);
    expect(handleCredentialChangeRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.ACCEPTED);
    expect(verifyUsernameMock).toHaveBeenCalledWith(
      'urn:example:account:1234567890',
    );

    verifyUsernameMock.mockReset();
  });

  it('dispatches accountPurgedSchema to handleAccountPurgedRequest', async () => {
    const verifyUsernameMock = verifyUsername as Mock;
    verifyUsernameMock.mockResolvedValue(true);

    const input = {
      iss: 'https://issuer.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721120400,
      aud: 'https://audience.example.com',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            uri: 'acct:someone@example.com',
            format: 'acct',
          },
        },
      },
    };
    (handleAccountPurgedRequest as any).mockReturnValue({
      statusCode: StatusCodes.NOT_IMPLEMENTED,
      body: ReasonPhrases.NOT_IMPLEMENTED,
    });
    const result = await requestHandler(input);
    expect(handleAccountPurgedRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.NOT_IMPLEMENTED);
    expect(verifyUsernameMock).toHaveBeenCalledWith('acct:someone@example.com');

    verifyUsernameMock.mockReset();
  });

  it('should return a 400 response if there is an error with parsing the request body', async () => {
    const input = {
      foo: 'bar',
    };

    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('return BAD_REQUEST 400 response for unsupported change type', async () => {
    const verifyUsernameMock = verifyUsername as Mock;
    verifyUsernameMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'create', // Unsupported change type
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
    };

    const result = await requestHandler(input);

    expect(handleCredentialChangeRequest).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(result.body).toBe(
      JSON.stringify({
        message: ReasonPhrases.BAD_REQUEST,
      }),
    );
    expect(verifyUsernameMock).not.toHaveBeenCalled();

    verifyUsernameMock.mockReset();
  });

  it('should return a 500 response if an CognitoError occurs', async () => {
    const verifyUsernameMock = verifyUsername as Mock;
    verifyUsernameMock.mockRejectedValue(new CognitoError('Cognito error'));

    const input = {
      iss: 'https://issuer.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721120400,
      aud: 'https://audience.example.com',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            uri: 'acct:someone@example.com',
            format: 'acct',
          },
        },
      },
    };
    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(handleAccountPurgedRequest).not.toHaveBeenCalled();

    verifyUsernameMock.mockReset();
  });

  it('should return a 202 when user is not valid with warning', async () => {
    const verifyUsernameMock = verifyUsername as Mock;
    verifyUsernameMock.mockResolvedValue(false);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const input = {
      iss: 'https://issuer.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721120400,
      aud: 'https://audience.example.com',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            uri: 'acct:someone@example.com',
            format: 'acct',
          },
        },
      },
    };

    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.ACCEPTED);
    expect(handleAccountPurgedRequest).not.toHaveBeenCalled();
    expect(verifyUsernameMock).toHaveBeenCalledWith('acct:someone@example.com');
    expect(warnSpy).toHaveBeenCalledWith('SIGNAL_WARN_USER_NOT_FOUND', {
      userId: 'acct:someone@example.com',
      correlationId: '123e4567-e89b-12d3-a456-426614174000',
    });

    verifyUsernameMock.mockReset();
  });

  it('should throw an error if SHARED_SIGNAL is disabled', async () => {
    process.env.ENABLE_SHARED_SIGNAL = 'false'; // Disable shared signal feature
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const input = {
      iss: 'https://issuer.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721120400,
      aud: 'https://audience.example.com',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            uri: 'acct:someone@example.com',
            format: 'acct',
          },
        },
      },
    };

    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE);
    expect(errorSpy).toHaveBeenCalledWith(
      logMessages.SIGNAL_DISABLED,
      'Shared signal feature is disabled',
    );
  });
});
