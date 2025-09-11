import { describe, it, expect, vi, beforeAll, Mock, afterAll } from 'vitest';

import {
  AccountPurgedRequest,
  handleAccountPurgedRequest,
} from '../../../handlers/account-purged-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

vi.mock('../../../cognito/delete-user', () => ({
  adminDeleteUser: vi.fn(),
}));

vi.mock('../../../cognito/sign-out-user', () => ({
  adminGlobalSignOut: vi.fn(),
}));

import { adminDeleteUser } from '../../../cognito/delete-user';
import { adminGlobalSignOut } from '../../../cognito/sign-out-user';
import { logger } from '../../../logger';

describe('handleAccountPurgedRequest', () => {
  const region = 'eu-west-2';

  const loggerInfoMock = vi
    .spyOn(logger, 'info')
    .mockImplementation(() => undefined);

  const loggerErrorMock = vi
    .spyOn(logger, 'error')
    .mockImplementation(() => undefined);

  beforeAll(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: '123',
      REGION: region,
    };
    vi.clearAllMocks();
    loggerInfoMock.mockReset();
    loggerErrorMock.mockReset();
  });

  afterAll(() => {
    loggerInfoMock.mockRestore();
    loggerErrorMock.mockRestore();
  });

  it('returns ACCEPTED for account purged events and logs success info message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    (adminDeleteUser as Mock).mockResolvedValue(true);

    const input = {
      aud: 'example-audience',
      iat: 1718000000,
      iss: 'https://issuer.example.com',
      jti: 'unique-jti-12345',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            format: 'urn:example:format',
            uri: 'urn:example:uri:12345',
          },
        },
      },
    } as AccountPurgedRequest;

    const response = await handleAccountPurgedRequest(input);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      'unique-jti-12345',
    );
    expect(adminGlobalSignOut).toHaveBeenCalledWith('urn:example:uri:12345');
    expect(adminDeleteUser).toHaveBeenCalledWith('urn:example:uri:12345');
    expect(loggerInfoMock).toHaveBeenCalledWith(
      'SIGNAL_SUCCESS_ACCOUNT_PURGE',
      {
        userId: 'urn:example:uri:12345',
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
  });

  it('returns INTERNAL_SERVER_ERROR for account purged events and logs error message', async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(false);
    (adminDeleteUser as Mock).mockResolvedValue(false);

    const input = {
      aud: 'example-audience',
      iat: 1718000000,
      iss: 'https://issuer.example.com',
      jti: 'unique-jti-12345',
      events: {
        'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
          subject: {
            format: 'urn:example:format',
            uri: 'urn:example:uri:12345',
          },
        },
      },
    } as AccountPurgedRequest;

    const response = await handleAccountPurgedRequest(input);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      'CorrelationId: ',
      'unique-jti-12345',
    );
    expect(adminGlobalSignOut).toHaveBeenCalledWith('urn:example:uri:12345');
    expect(adminDeleteUser).toHaveBeenCalledWith('urn:example:uri:12345');
    expect(loggerErrorMock).toHaveBeenCalledWith('SIGNAL_ERROR_ACCOUNT_PURGE', {
      userId: 'urn:example:uri:12345',
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
  });
});
