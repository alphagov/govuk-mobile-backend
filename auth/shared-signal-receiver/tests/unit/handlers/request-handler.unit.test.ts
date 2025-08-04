import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestHandler } from '../../../handlers/request-handler';
import { handleCredentialChangeRequest } from '../../../handlers/credential-change-handler';
import { handleAccountPurgedRequest } from '../../../handlers/account-purged-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { CognitoError } from '../../../errors';
import {doesUserExists} from '../../../cognito/verify-users'

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
  doesUserExists: vi.fn(),
}));

describe('requestHandler', () => {
  const region = 'eu-west-2';

  beforeEach(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches credentialChangeSchema to handleCredentialChangeRequest', async () => {
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
    const result = await requestHandler(JSON.stringify(input));
    expect(handleCredentialChangeRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.ACCEPTED);
  });

  it('dispatches accountPurgedSchema to handleAccountPurgedRequest', async () => {
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
    const result = await requestHandler(JSON.stringify(input));
    expect(handleAccountPurgedRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.NOT_IMPLEMENTED);
  });

  it('should return a 400 response if there is an error with parsing the request body', async () => {
    const input = {
      foo: 'bar',
    };

    const result = await requestHandler(JSON.stringify(input));
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return a 500 response if there is a CognitoError', async () => {
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

    (handleCredentialChangeRequest as any).mockRejectedValue(
      new CognitoError('Failed to process request'),
    );

    const result = await requestHandler(JSON.stringify(input));
    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

   it('should return a 200 user does not exist', async () => {
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

    (handleCredentialChangeRequest as any).mockRejectedValue(
      new CognitoError('Failed to process request'),
    );

    const result = await requestHandler(JSON.stringify(input));
    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
