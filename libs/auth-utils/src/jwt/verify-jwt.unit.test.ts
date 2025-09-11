import {
  calculateJwkThumbprint,
  CryptoKey,
  exportJWK,
  generateKeyPair,
  JSONWebKeySet,
  JWK,
  JWTPayload,
  SignJWT,
} from 'jose';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { sendHttpRequest } from '@libs/http-utils';
import { fetchJwks } from '../jwks/fetch-jwks';
import { verifyJwt } from './verify-jwt';
import { JOSEAlgNotAllowed, JWTClaimValidationFailed } from 'jose/errors';

vi.mock('@libs/http-utils');

const testJwksUri = 'https://verify-jwt-test/.well-known';

interface KeyData {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JWK;
}

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
const testingTyp = 'typ-test';
const testingClaims = ['test_claim'];

const sampleJWTPayload: generateJWTPayload = {
  issuer: 'auth-utils-testing',
  audience: 'vitest',
  jti: '123456',
  alg: testingAlgorithm,
  expiryDate: new Date(),
  payload: {
    test_claim: {
      foo: 'foo',
      bar: 'bar',
    },
  },
};

const configureTestingKeys = async (keyCount: number): Promise<KeyData[]> => {
  let testingKeys: KeyData[] = [];
  for (let i = 0; i < keyCount; i++) {
    const { privateKey, publicKey } = await generateKeyPair(testingAlgorithm, {
      extractable: true,
    });
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = await calculateJwkThumbprint(publicJwk, 'sha256');
    const keyData: KeyData = {
      privateKey,
      publicKey,
      publicJwk,
    };
    testingKeys.push(keyData);
  }
  return testingKeys;
};

const buildJWKS = (keyDataArray: KeyData[]): JSONWebKeySet => {
  let jwks: JSONWebKeySet = {
    keys: [],
  };
  keyDataArray.forEach((keyData) => {
    jwks.keys.push(keyData.publicJwk);
  });
  return jwks;
};

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

describe('GIVEN a call to verify a JWT', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validJwtScenarios = [
    {
      keyCount: 1,
      signingKeyIndex: 0,
      jwksCacheKey: 'valid-verify-kc-1',
    },
    {
      keyCount: 3,
      signingKeyIndex: 1,
      jwksCacheKey: 'valid-verify-kc-3',
    },
  ];
  it.each(validJwtScenarios)(
    'WITH keycount: $keyCount WHEN the JWT is valid THEN the JWTPayload is returned',
    async ({ keyCount, signingKeyIndex, jwksCacheKey }) => {
      const testingKeys: KeyData[] = await configureTestingKeys(keyCount);
      const testingJwks = buildJWKS(testingKeys);
      const kid = testingKeys[signingKeyIndex]?.publicJwk!.kid!;
      const jwt = await signWithPrivateKey(
        testingKeys[signingKeyIndex]?.privateKey!,
        {
          ...sampleJWTPayload,
          kid,
          expiryDate: new Date('01/02/2025'),
          typ: testingTyp,
        },
      );

      vi.mocked(sendHttpRequest).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testingJwks),
      } as unknown as Response);

      const jwks = await fetchJwks(jwksCacheKey, testJwksUri, {
        alg: testingAlgorithm,
        kid,
      });

      const payload = await verifyJwt(jwt, jwks, {
        audience: sampleJWTPayload.audience,
        algorithms: [sampleJWTPayload.alg],
        issuer: sampleJWTPayload.issuer,
        typ: testingTyp,
        requiredClaims: testingClaims,
      });
      expect(payload).toEqual(
        expect.objectContaining({ ...sampleJWTPayload.payload }),
      );
    },
  );

  const invalidJwtScenarios = [
    {
      jwksCacheKey: 'invalid-verify-aud',
      invalidScenario: 'INVALID AUDIENCE',
      errorName: 'JWTCLaimValidationFailed',
      errorType: JWTClaimValidationFailed,
      payloadOverrides: {
        audience: 'invalid',
      },
    },
    {
      jwksCacheKey: 'invalid-verify-alg',
      invalidScenario: 'INVALID ALGORITHM',
      errorName: 'JWTCLaimValidationFailed',
      errorType: JOSEAlgNotAllowed,
      payloadOverrides: {
        algorithms: ['invalid'],
      },
    },
    {
      jwksCacheKey: 'invalid-verify-iss',
      invalidScenario: 'INVALID ISSUER',
      errorName: 'JWTCLaimValidationFailed',
      errorType: JWTClaimValidationFailed,
      payloadOverrides: {
        issuer: 'invalid',
      },
    },
    {
      jwksCacheKey: 'invalid-verify-typ',
      invalidScenario: 'INVALID TYP',
      errorName: 'JWTCLaimValidationFailed',
      errorType: JWTClaimValidationFailed,
      payloadOverrides: {
        typ: 'invalid',
      },
    },
    {
      jwksCacheKey: 'invalid-verify-claims',
      invalidScenario: 'INVALID CLAIMS',
      errorName: 'JWTCLaimValidationFailed',
      errorType: JWTClaimValidationFailed,
      payloadOverrides: {
        requiredClaims: ['invalid'],
      },
    },
  ];
  it.each(invalidJwtScenarios)(
    'WHEN the JWT is invalid due to $invalidScenario THEN an $errorName is thrown',
    async ({ jwksCacheKey, payloadOverrides, errorType }) => {
      const testingKeys: KeyData[] = await configureTestingKeys(1);
      const testingJwks = buildJWKS(testingKeys);
      const kid = testingKeys[0]?.publicJwk!.kid!;
      const jwt = await signWithPrivateKey(testingKeys[0]?.privateKey!, {
        ...sampleJWTPayload,
        kid,
        expiryDate: new Date('01/02/2025'),
        typ: testingTyp,
      });

      vi.mocked(sendHttpRequest).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testingJwks),
      } as unknown as Response);

      const jwks = await fetchJwks(jwksCacheKey, testJwksUri, {
        alg: testingAlgorithm,
        kid,
      });

      try {
        const payload = await verifyJwt(jwt, jwks, {
          audience: sampleJWTPayload.audience,
          algorithms: [sampleJWTPayload.alg],
          issuer: sampleJWTPayload.issuer,
          typ: testingTyp,
          requiredClaims: testingClaims,
          ...payloadOverrides,
        });
      } catch (error) {
        console.log(error);
        expect(error instanceof errorType).toBeTruthy();
      }
    },
  );
});
