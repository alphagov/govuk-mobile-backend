import { describe, it, expect, vi, beforeAll, Mock, beforeEach } from 'vitest';
import { handleCredentialChangeRequest } from '../../../handlers/credential-change-handler';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { adminGlobalSignOut } from '../../../cognito/sign-out-user';
import {
  CredentialChangeEventBuilder,
  SignalBuilder,
} from '../../helpers/signal';
import { logMessages } from '../../../log-messages';
import { logger } from '../../../logger';

vi.mock('../../../cognito/sign-out-user', () => ({
  adminGlobalSignOut: vi.fn(),
}));

describe('handleCredentialChangeRequest', () => {
  const credentialChangeEvent = new CredentialChangeEventBuilder();
  const signalBuilder = new SignalBuilder(credentialChangeEvent);

  beforeEach(() => {
    vi.resetAllMocks();
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
  });

  it('should revoke all the tokens for a given user', async () => {
    // (adminGlobalSignOut as Mock).mockResolvedValue(true);
    const signal = signalBuilder.build();
    await expect(handleCredentialChangeRequest(signal)).resolves.toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      statusCode: StatusCodes.ACCEPTED,
    });

    expect(adminGlobalSignOut).toHaveBeenCalled();
  });

  it.each([
    {
      credentialType: 'password',
    },
    {
      credentialType: 'email',
    },
  ])('should log the specific credential type', async ({ credentialType }) => {
    const loggerInfoMock = vi.spyOn(logger, 'info');
    credentialChangeEvent.withCredentialType(credentialType);

    const signal = signalBuilder.build();

    await handleCredentialChangeRequest(signal);

    expect(loggerInfoMock).toHaveBeenNthCalledWith(
      2,
      logMessages.SIGNAL_SUCCESS_CREDENTIAL_CHANGE,
      {
        correlationId: signal.jti,
        credentialType: credentialType,
        userId: 'urn:example:account:1234567890',
      },
    );
  });

  it.each([
    {
      changeType: 'update',
      credentialType: 'password',
    },
    {
      changeType: 'update',
      credentialType: 'email',
    },
  ])(
    'returns a 202 ACCEPTED response for valid requests',
    async ({ changeType, credentialType }) => {
      credentialChangeEvent
        .withChangeType(changeType)
        .withCredentialType(credentialType);

      const signal = signalBuilder.build();

      const response = await handleCredentialChangeRequest(signal);

      expect(response).toEqual({
        body: JSON.stringify({
          message: ReasonPhrases.ACCEPTED,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        statusCode: StatusCodes.ACCEPTED,
      });
    },
  );

  describe('when the signout operation fails', () => {
    let response;
    const signal = signalBuilder.build();
    let loggerErrorMock = vi
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);

    beforeEach(async () => {
      loggerErrorMock.mockReset();
      (adminGlobalSignOut as Mock).mockResolvedValue(false);
      response = await handleCredentialChangeRequest(signal);
    });

    it('should return 500 INTERNAL_SERVER_ERROR if the operation fails', async () => {
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

    it('should produce an error log with the correlation id', async () => {
      expect(loggerErrorMock).toHaveBeenCalledWith(
        logMessages.SIGNAL_ERROR_CREDENTIAL_CHANGE,
        {
          userId: 'urn:example:account:1234567890',
          correlationId: signal.jti,
          changeType: 'update',
        },
      );
    });
  });

  it('should propagate errors from adminGlobalSignOut', async () => {
    (adminGlobalSignOut as Mock).mockRejectedValue(
      new Error('Sign out failed'),
    );
    const signal = signalBuilder.build();
    await expect(handleCredentialChangeRequest(signal)).rejects.toThrow(
      'Sign out failed',
    );
  });
});
