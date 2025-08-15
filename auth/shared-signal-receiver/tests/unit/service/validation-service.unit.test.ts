import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verifyUsername } from '../../../cognito/verify-users';
import { isUserValid } from '../../../service/validation-service';
import { logMessages } from '../../../log-messages';

vi.mock('../../../cognito/verify-users', () => ({
  verifyUsername: vi.fn(),
}));

describe('validation-service', () => {
  const schemaName =
    'https://schemas.openid.net/secevent/caep/event-type/credential-change';
  const jti = 'test-jti';
  const username = 'urn:example:account:1234567890';

  let consoleWarnMock = vi
    .spyOn(console, 'warn')
    .mockImplementation(() => undefined);
  let consoleErrorMock = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    consoleErrorMock.mockReset();
    consoleWarnMock.mockReset();
  });

  describe('isUserValid', () => {
    const verifyUsernameMock = verifyUsername as Mock;

    beforeEach(() => {
      verifyUsernameMock.mockReset();
    });

    it('returns true if verifyUsername resolves true', async () => {
      verifyUsernameMock.mockResolvedValue(true);
      const incomingRequest = {
        jti,
        events: {
          [schemaName]: {
            subject: { uri: username },
          },
        },
      };
      const result = await isUserValid(incomingRequest, schemaName);
      expect(result).toBe(true);
      expect(consoleWarnMock).not.toHaveBeenCalled();
    });

    it('returns false and logs warning if verifyUsername resolves false', async () => {
      verifyUsernameMock.mockResolvedValue(false);
      const incomingRequest = {
        jti,
        events: {
          [schemaName]: {
            subject: { uri: username },
          },
        },
      };
      const result = await isUserValid(incomingRequest, schemaName);
      expect(result).toBe(false);
      expect(consoleWarnMock).toHaveBeenCalledWith(
        logMessages.SIGNAL_WARN_USER_NOT_FOUND,
        { userId: username, correlationId: jti },
      );
    });
  });
});
