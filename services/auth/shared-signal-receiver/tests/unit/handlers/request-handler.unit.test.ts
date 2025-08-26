import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { requestHandler } from '../../../handlers/request-handler';
import { handleCredentialChangeRequest } from '../../../handlers/credential-change-handler';
import { handleAccountPurgedRequest } from '../../../handlers/account-purged-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { CognitoError } from '../../../errors';
import { logMessages } from '../../../log-messages';
import { isUserValid } from '../../../service/validation-service';

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
vi.mock('../../../service/validation-service', () => ({
  isChangeTypeValid: vi.fn(),
  isUserValid: vi.fn(),
}));

describe('requestHandler', () => {
  const region = 'eu-west-2';
  const credentialChangeSchema =
    'https://schemas.openid.net/secevent/caep/event-type/credential-change';
  const accountPurgedSchema =
    'https://schemas.openid.net/secevent/risc/event-type/account-purged';

  const isUserValidMock = isUserValid as Mock;

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
    isUserValidMock.mockReset();
  });

  it('dispatches credentialChangeSchema to handleCredentialChangeRequest', async () => {
    isUserValidMock.mockResolvedValue(true);

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
    expect(isUserValidMock).toHaveBeenCalledWith(input, credentialChangeSchema);
    isUserValidMock.mockReset();
  });

  it('dispatches accountPurgedSchema to handleAccountPurgedRequest', async () => {
    isUserValidMock.mockResolvedValue(true);

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
      statusCode: StatusCodes.ACCEPTED,
      body: ReasonPhrases.ACCEPTED,
    });
    const result = await requestHandler(input);
    expect(handleAccountPurgedRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.ACCEPTED);
    expect(isUserValidMock).toHaveBeenCalledWith(input, accountPurgedSchema);
    isUserValidMock.mockReset();
  });

  it('should return a 400 response if there is an error with parsing the request body', async () => {
    const input = {
      // Invalid input that does not match any schema
      foo: 'bar',
    };

    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('return BAD_REQUEST 400 response when change type is invalid', async () => {
    isUserValidMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/credential-change':
          {
            change_type: 'anything', // Unsupported change type
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
    expect(isUserValidMock).not.toHaveBeenCalled();
    isUserValidMock.mockReset();
  });

  it('should propogate any errors to the root error handler', async () => {
    isUserValidMock.mockRejectedValue(new CognitoError('Cognito error'));

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
    await expect(requestHandler(input)).rejects.toThrow(CognitoError);
  });

  it('should return a 202 when user is not valid with warning for account purged', async () => {
    isUserValidMock.mockResolvedValue(false);

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
    expect(isUserValidMock).toHaveBeenCalledWith(
      input,
      'https://schemas.openid.net/secevent/risc/event-type/account-purged',
    );
    isUserValidMock.mockReset();
  });

  it('should return SERVICE_UNAVAILABLE when SHARED_SIGNAL is disabled', async () => {
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

  it('should return BAD_REQUEST 400 response when schema is unknown', async () => {
    isUserValidMock.mockResolvedValue(true);

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/caep/event-type/unknown-event': {
          change_type: 'update',
          credential_type: 'password',
          subject: {
            uri: 'urn:example:account:1234567890',
            format: 'urn:example:format:account-id',
          },
        },
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
          {
            email: 'foo@bar.com',
          },
      },
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await requestHandler(input);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(result.body).toBe(
      JSON.stringify({
        message: ReasonPhrases.BAD_REQUEST,
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(logMessages.ERROR_UNKNOWN_SIGNAL);
    expect(isUserValidMock).not.toHaveBeenCalled();
    isUserValidMock.mockReset();

    errorSpy.mockRestore();
  });

  it('should not validate user when requiresUserValidation is false', async () => {
    const signalVerificationSchema =
      'https://schemas.openid.net/secevent/sse/event-type/verification';

    const input = {
      iss: 'https://identity.example.com',
      jti: '123e4567-e89b-12d3-a456-426614174000',
      iat: 1721126400,
      aud: 'https://service.example.gov.uk',
      events: {
        'https://schemas.openid.net/secevent/sse/event-type/verification': {
          state: 'some-state-value',
        },
      },
    };

    (handleCredentialChangeRequest as any).mockReturnValue({
      statusCode: StatusCodes.ACCEPTED,
      body: ReasonPhrases.ACCEPTED,
    });
    const result = await requestHandler(input);
    expect(handleCredentialChangeRequest).not.toHaveBeenCalled();
    expect(result.statusCode).not.toBe(StatusCodes.BAD_REQUEST);
    expect(isUserValidMock).not.toHaveBeenCalledWith(
      input,
      signalVerificationSchema,
    );
    isUserValidMock.mockReset();
  });
});
