import { describe, it, expect, vi } from 'vitest';
import { generateKeyPair, JWTPayload, KeyLike, SignJWT } from 'jose';
import { verifySETJwt } from '../../../signature-verification/verify-signature';
import { SignatureVerificationError } from '../../../errors';

export interface generateJWTPayload {
  issuer: string;
  audience: string;
  jti: string;
  payload: JWTPayload;
  alg: string;
  issuedAt?: number;
  typ?: string;
  exp?: string | number;
  pk?: KeyLike;
  kid?: string;
}

const sampleVerificationEvent = {
  alg: 'RS256',
  audience: 'https://aud.example.com',
  issuer: 'https://issuer.example.com',
  jti: '123456',
  kid: '1234',
  payload: {
    sub_id: {
      format: 'opaque',
      id: 'f67e39a0a4d34d56b3aa1bc4cff0069f', // pragma: allowlist-secret
    },
    events: {
      'https://schemas.openid.net/secevent/ssf/event-type/verification': {
        state: 'VGhpcyBpcyBhbiBleGFtcGxlIHN0YXRlIHZhbHVlLgo=', // pragma: allowlist-secret
      },
    },
  },
};

describe('verify-signature', async () => {
  const { publicKey, privateKey } = await generateKeyPair(
    sampleVerificationEvent.alg,
    {
      extractable: true,
    },
  );

  const sharedSignalsConfig = {
    jwksUri: 'https://foobar.com',
    audience: sampleVerificationEvent.audience,
    issuer: sampleVerificationEvent.issuer,
    cacheDurationMs: 10 * 60 * 1000,
    eventAlgorithm: sampleVerificationEvent.alg,
  };

  const mockFetchJwks = async (): Promise<KeyLike> => publicKey;

  const signEventPayload = async ({
    alg,
    audience,
    issuer,
    jti,
    payload,
    issuedAt,
    kid,
    exp = '2h',
    typ = 'secevent+jwt',
    pk = privateKey,
  }: generateJWTPayload) => {
    return new SignJWT(payload)
      .setProtectedHeader({
        alg,
        typ,
        kid,
      })
      .setIssuedAt(issuedAt ? issuedAt : Date.now())
      .setIssuer(issuer)
      .setJti(jti)
      .setExpirationTime(exp)
      .setAudience(audience)
      .sign(pk);
  };

  it('should accept valid SET events', async () => {
    const jwt = await signEventPayload(sampleVerificationEvent);

    const response = await verifySETJwt({
      jwt,
      config: sharedSignalsConfig,
      fetchJwks: mockFetchJwks,
    });

    expect(response).toBeDefined();
  });

  it('should verify the signature of the SET', async () => {
    const { publicKey: newPublicKey } = await generateKeyPair(
      sampleVerificationEvent.alg,
    );
    const jwt = await signEventPayload(sampleVerificationEvent);

    const mockFetchJwksAlternate = async (): Promise<KeyLike> => newPublicKey;

    await expect(
      verifySETJwt({
        jwt,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwksAlternate,
      }),
    ).rejects.toThrowError(
      new SignatureVerificationError(
        `JWSSignatureVerificationFailed: signature verification failed`,
      ),
    );
  });

  it('should check the expiry of the SET', async () => {
    const issuedInFuture = new Date();
    issuedInFuture.setDate(issuedInFuture.getDate() + 1);
    const jwt = await signEventPayload({
      ...sampleVerificationEvent,
      exp: 1,
    });

    await expect(
      verifySETJwt({
        jwt,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrow(
      new SignatureVerificationError(
        `JWTExpired: "exp" claim timestamp check failed`,
      ),
    );
  });

  it('should check the issued at claim is in the past', async () => {
    const issuedInFuture = new Date();
    issuedInFuture.setDate(issuedInFuture.getDate() + 20);
    const jwt = await signEventPayload({
      ...sampleVerificationEvent,
      issuedAt: issuedInFuture.getTime(),
    });
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    const result = await verifySETJwt({
      jwt,
      config: sharedSignalsConfig,
      fetchJwks: mockFetchJwks,
    });
  });

  it('should check the alg header', async () => {
    const { publicKey: newPublicKey, privateKey: newPrivateKey } =
      await generateKeyPair('ES256');
    const jwt = await signEventPayload({
      ...sampleVerificationEvent,
      alg: 'ES256',
      pk: newPrivateKey,
    });
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({
        jwt,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrowError(
      new SignatureVerificationError(
        `JOSEAlgNotAllowed: "alg" (Algorithm) Header Parameter value not allowed`,
      ),
    );
  });

  it('should check the kid header', async () => {
    const jwt = await signEventPayload({
      ...sampleVerificationEvent,
      kid: undefined,
    });
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({
        jwt,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrowError(
      new SignatureVerificationError(
        `TypeError: JWT is missing the "kid" header`,
      ),
    );
  });

  it('should throw if jwt is undefined', async () => {
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({
        jwt: undefined,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrowError(
      new SignatureVerificationError(`TypeError: Invalid jwt type`),
    );
  });

  it('should throw if jwt cant be decoded', async () => {
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({
        jwt: 'eJy',
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrowError(
      new SignatureVerificationError(
        `TypeError: Invalid Token or Protected Header formatting`,
      ),
    );
  });

  it.each([
    [
      { issuer: 'who-knowns' },
      `JWTClaimValidationFailed: unexpected "iss" claim value`,
    ],
    [
      { audience: 'https://not-known' },
      `JWTClaimValidationFailed: unexpected "aud" claim value`,
    ],
    [
      { typ: 'jwt' },
      `JWTClaimValidationFailed: unexpected "typ" JWT header value`,
    ],
  ])('should verify the issuer claim', async (field, message) => {
    const jwt = await signEventPayload({
      ...sampleVerificationEvent,
      ...field,
    });
    const mockFetchJwks = vi.fn().mockResolvedValue(publicKey);

    await expect(
      verifySETJwt({
        jwt,
        config: sharedSignalsConfig,
        fetchJwks: mockFetchJwks,
      }),
    ).rejects.toThrowError(new SignatureVerificationError(message));
  });
});
