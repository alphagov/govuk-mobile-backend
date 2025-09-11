import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateKeyPair,
  JWTPayload,
  decodeProtectedHeader,
  CryptoKey,
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
} from 'jose';
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

const signWithPrivateKey = async (
  privateKey: CryptoKey,
  options: generateJWTPayload,
) => {
  const { issuer, audience, jti, payload, alg, expiryDate, typ, kid } = options;
  const protectedHeader = {
    alg,
    ...(typ ? { typ } : {}),
    ...(kid ? { kid } : {}),
  };
  return await new SignJWT(payload)
    .setProtectedHeader(protectedHeader)
    .setIssuedAt(new Date())
    .setIssuer(issuer)
    .setJti(jti)
    .setExpirationTime(expiryDate)
    .setAudience(audience)
    .sign(privateKey);
};

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
  let publicKey: CryptoKey;
  let publicKid: string;
  let privateKey: CryptoKey;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
    vi.resetAllMocks();

    ({ publicKey, privateKey } = await generateKeyPair('RS256', {
      extractable: true,
    }));
    const publicJwk = await exportJWK(publicKey);
    publicKid = await calculateJwkThumbprint(publicJwk, 'sha256');

    vi.mocked(fetchJwks).mockResolvedValue(publicKey);
    vi.mocked(decodeProtectedHeader).mockReturnValue({ kid: publicKid });
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
    vi.mocked(decodeProtectedHeader).mockReturnValue({});

    const jwt = await signWithPrivateKey(privateKey, sampleVerificationEvent);

    await expect(
      verifySETJwt({ jwt, config: sharedSignalsConfig }),
    ).rejects.toThrow(
      new InvalidKeyError(
        'One or more keys used to encrypt or sign the SET is invalid or otherwise unacceptable to the SET Recipient (expired, revoked, failed certificate validation, etc.).',
      ),
    );
  });

  it('WHEN the fetchJwks call errors THEN a SignatureVerificationError is thrown', async () => {
    vi.mocked(fetchJwks).mockRejectedValue(new Error('Could not find JWKS'));

    const jwt = await signWithPrivateKey(privateKey, sampleVerificationEvent);

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
      const jwt = await signWithPrivateKey(privateKey, sampleVerificationEvent);

      await expect(
        verifySETJwt({
          jwt,
          config: { ...sharedSignalsConfig, ...configOverrides },
        }),
      ).rejects.toThrow(error);
    },
  );

  it('WHEN the jwt is expired THEN a SignatureVerificationError is thrown', async () => {
    const jwt = await signWithPrivateKey(privateKey, {
      ...sampleVerificationEvent,
      expiryDate: new Date('01/01/2024'),
    });

    await expect(
      verifySETJwt({ jwt, config: sharedSignalsConfig }),
    ).rejects.toThrow(
      new SignatureVerificationError(
        'JWTExpired: "exp" claim timestamp check failed',
      ),
    );
  });

  it('WHEN the jwt is valid THEN it returns the payload', async () => {
    const jwt = await signWithPrivateKey(privateKey, sampleVerificationEvent);

    const response = await verifySETJwt({ jwt, config: sharedSignalsConfig });
    expect(response).toEqual(expect.objectContaining(testJwtPayload));
  });
});
