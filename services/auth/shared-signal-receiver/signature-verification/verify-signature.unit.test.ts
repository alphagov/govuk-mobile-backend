import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeysAndJwt } from '../../../../libs/test-utils/src/jwt/generate-keys-and-jwt';
import { JWTPayload, decodeProtectedHeader } from 'jose';
import { verifySETJwt } from '../signature-verification/verify-signature';
import {
  InvalidKeyError,
  InvalidRequestError,
  SignatureVerificationError,
} from '../errors';
import { fetchJwks } from '@libs/auth-utils';

vi.mock('@libs/auth-utils', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@libs/auth-utils')
  >();

  return {
    ...originalModule, // Include all original exports
    fetchJwks: vi.fn().mockReturnValue({}),
  };
});

vi.mock('jose', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('jose')>();

  return {
    ...originalModule, // Include all original exports
    decodeProtectedHeader: vi.fn().mockReturnValue({ kid: 'kid' }),
  };
});

interface generateJWTPayload {
  issuer: string;
  audience: string;
  jti: string;
  payload: JWTPayload;
  alg: string;
  expiryDate: Date;
  typ?: string;
  kid?: string;
}

const testingAlgorithm = 'RS256';

const testJwtPayload = {
  sub_id: {
    format: 'opaque',
    id: 'f67e39a0a4d34d56b3aa1bc4cff0069f', // pragma: allowlist-secret
  },
  events: {
    'https://schemas.openid.net/secevent/ssf/event-type/verification': {
      state: 'VGhpcyBpcyBhbiBleGFtcGxlIHN0YXRlIHZhbHVlLgo=', // pragma: allowlist-secret
    },
  },
};

const sampleVerificationEvent: generateJWTPayload = {
  alg: testingAlgorithm,
  audience: 'https://aud.example.com',
  issuer: 'https://issuer.example.com',
  jti: '123456',
  kid: '1234',
  typ: 'secevent+jwt',
  payload: testJwtPayload,
  expiryDate: new Date('01/02/2025'),
};

const sharedSignalsConfig = {
  jwksUri: 'https://foobar.com',
  audience: sampleVerificationEvent.audience,
  issuer: sampleVerificationEvent.issuer,
  cacheDurationMs: 10 * 60 * 1000,
  eventAlgorithm: sampleVerificationEvent.alg,
};

describe('GIVEN a call to verifySETJwt', async () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('WHEN the given jwt is not a string THEN an InvalidRequestError is thrown', async () => {
    await expect(
      verifySETJwt({ jwt: null, config: sharedSignalsConfig }),
    ).rejects.toThrow(new InvalidRequestError('The jwt is not a string'));
  });

  it('WHEN the given jwt protected headers kid is not defined THEN a InvalidKeyError is throw', async () => {
    const { jwt } = await generateKeysAndJwt(sampleVerificationEvent);

    vi.mocked(decodeProtectedHeader).mockReturnValue({});

    await expect(
      verifySETJwt({ jwt, config: sharedSignalsConfig }),
    ).rejects.toThrow(
      new InvalidKeyError(
        'One or more keys used to encrypt or sign the SET is invalid or otherwise unacceptable to the SET Recipient (expired, revoked, failed certificate validation, etc.).',
      ),
    );
  });

  it('WHEN the fetchJwks call errors THEN a SignatureVerificationError is thrown', async () => {
    const { publicKid, jwt } = await generateKeysAndJwt(
      sampleVerificationEvent,
    );

    vi.mocked(decodeProtectedHeader).mockReturnValue({ kid: publicKid });
    vi.mocked(fetchJwks).mockRejectedValue(new Error('Could not find JWKS'));

    await expect(
      verifySETJwt({ jwt, config: sharedSignalsConfig }),
    ).rejects.toThrow(
      new SignatureVerificationError('Error: Could not find JWKS'),
    );
  });

  const invalidJwtScenarios = [
    {
      scenario: 'Invalid Audience',
      configOverrides: {
        audience: 'invalid',
      },
      error: new SignatureVerificationError(
        'JWTClaimValidationFailed: unexpected "aud" claim value',
      ),
    },
    {
      scenario: 'Invalid Issuer',
      configOverrides: {
        issuer: 'invalid',
      },
      error: new SignatureVerificationError(
        'JWTClaimValidationFailed: unexpected "iss" claim value',
      ),
    },
    {
      scenario: 'Invalid Algorithm',
      configOverrides: {
        eventAlgorithm: 'invalid',
      },
      error: new SignatureVerificationError(
        'JOSEAlgNotAllowed: "alg" (Algorithm) Header Parameter value not allowed',
      ),
    },
  ];
  it.each(invalidJwtScenarios)(
    'WHEN the verifyJwt call errors with $scenario THEN a SignatureVerificationError is thrown',
    async ({ configOverrides, error }) => {
      const { publicKey, publicKid, jwt } = await generateKeysAndJwt(
        sampleVerificationEvent,
      );

      vi.mocked(decodeProtectedHeader).mockReturnValue({ kid: publicKid });
      vi.mocked(fetchJwks).mockResolvedValue(publicKey);

      await expect(
        verifySETJwt({
          jwt,
          config: { ...sharedSignalsConfig, ...configOverrides },
        }),
      ).rejects.toThrow(error);
    },
  );

  it('WHEN the jwt is expired THEN a SignatureVerificationError is thrown', async () => {
    const { publicKey, publicKid, jwt } = await generateKeysAndJwt({
      ...sampleVerificationEvent,
      expiryDate: new Date('01/01/2024'),
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ kid: publicKid });
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({ jwt, config: sharedSignalsConfig }),
    ).rejects.toThrow(
      new SignatureVerificationError(
        'JWTExpired: "exp" claim timestamp check failed',
      ),
    );
  });

  it('WHEN the jwt is valid THEN it returns the payload', async () => {
    const { publicKey, publicKid, jwt } = await generateKeysAndJwt(
      sampleVerificationEvent,
    );
    vi.mocked(decodeProtectedHeader).mockReturnValue({ kid: publicKid });
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);

    const response = await verifySETJwt({ jwt, config: sharedSignalsConfig });
    expect(response).toEqual(expect.objectContaining(testJwtPayload));
  });
});
