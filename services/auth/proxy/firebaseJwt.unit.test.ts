import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateFirebaseJWT } from './firebaseJwt';
import { UnknownAppError, JwtError } from './errors';
import { AppConfig } from './config';
import { fetchJwks } from '@libs/auth-utils';
import { decodeProtectedHeader } from 'jose';
import { GenerateJwtPayload, generateKeysAndJwt } from '@libs/test-utils';
import { JWTClaimValidationFailed } from 'jose/errors';

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

const configValues: AppConfig = {
  firebaseIosAppId: 'mocked-app-id',
  firebaseAndroidAppId: 'mocked-app-id',
  cognitoUrl: new URL('https://mocked-cognito-url.com'),
  projectId: 'mocked-project-id',
  audience: 'mocked-audience',
  customDomainConfigName: 'mocked-domain',
  awsRegion: 'eu-west-2',
  cognitoSecretName: 'testing', //pragma: allowlist-secret
  timeoutMs: 5000,
};

const mockProtectedHeaders = { kid: 'abc-123', alg: 'RS256', typ: 'JWT' };
const mockJwtPayload = {
  sub: configValues.firebaseAndroidAppId,
  test_claim: {
    foo: 'bar',
  },
};
const mockJwtOptions: GenerateJwtPayload = {
  ...mockProtectedHeaders,
  issuer: `https://firebaseappcheck.googleapis.com/${configValues.projectId}`,
  audience: [
    `projects/${configValues.audience}`,
    `projects/${configValues.projectId}`,
  ],
  jti: '123456',
  expiryDate: new Date(),
  payload: mockJwtPayload,
};

describe('firebaseJwt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
    vi.resetAllMocks();
  });

  const invalidProtectedHeaders = [
    {
      scenario: 'alg is missing',
      headerOverrides: {
        typ: mockProtectedHeaders.typ,
        kid: mockProtectedHeaders.kid,
      },
      error: new JwtError(
        'JWT is missing the "alg" header',
        'alg header is missing',
      ),
    },
    {
      scenario: 'typ is missing',
      headerOverrides: {
        alg: mockProtectedHeaders.alg,
        kid: mockProtectedHeaders.kid,
      },
      error: new JwtError(
        'JWT is missing the "typ" header',
        'typ header is missing',
      ),
    },
    {
      scenario: 'kid is missing',
      headerOverrides: {
        typ: mockProtectedHeaders.typ,
        alg: mockProtectedHeaders.alg,
      },
      error: new JwtError(
        'JWT is missing the "kid" header',
        'kid header is missing',
      ),
    },
  ];
  it.each(invalidProtectedHeaders)(
    'should thrown an error if $scenario',
    async ({ headerOverrides, error }) => {
      const { jwt } = await generateKeysAndJwt(mockJwtOptions);
      vi.mocked(decodeProtectedHeader).mockReturnValue({ ...headerOverrides });

      await expect(
        validateFirebaseJWT({
          token: jwt,
          configValues,
        }),
      ).rejects.toThrow(error);
    },
  );

  it('should throw an error if the JWKS fetch fails', async () => {
    const { publicKid, jwt } = await generateKeysAndJwt(mockJwtOptions);
    vi.mocked(decodeProtectedHeader).mockReturnValue({
      ...mockProtectedHeaders,
      kid: publicKid,
    });
    vi.mocked(fetchJwks).mockRejectedValue(
      new Error('Jwks response is not valid Jwks'),
    );

    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues,
      }),
    ).rejects.toThrow('Jwks response is not valid Jwks');
  });

  it('should throw an error when typ is not JWT ', async () => {
    const { publicKey, jwt } = await generateKeysAndJwt(mockJwtOptions);
    vi.mocked(decodeProtectedHeader).mockReturnValue({
      ...mockProtectedHeaders,
      typ: 'invalid',
    });
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);

    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues,
      }),
    ).rejects.toThrow(new JwtError('JWT "typ" header has an invalid type'));
  });

  it('should return void for a valid token', async () => {
    const { publicKey, jwt } = await generateKeysAndJwt({
      ...mockJwtOptions,
      payload: {
        ...mockJwtOptions.payload,
        sub: configValues.firebaseIosAppId,
      },
    });
    vi.mocked(decodeProtectedHeader).mockReturnValue(mockProtectedHeaders);
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);

    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues,
      }),
    ).resolves.toBeUndefined();
  });

  it.each(['HS256', 'HS384', 'HS512', 'None'])(
    'should throw an error when Algorithm is %s',
    async (algorithm) => {
      const { publicKey, jwt } = await generateKeysAndJwt(mockJwtOptions);
      vi.mocked(decodeProtectedHeader).mockReturnValue({
        ...mockProtectedHeaders,
        alg: algorithm,
      });
      vi.mocked(fetchJwks).mockResolvedValue(publicKey);

      await expect(
        validateFirebaseJWT({
          token: jwt,
          configValues,
        }),
      ).rejects.toThrow(
        new JwtError(`Invalid algorithm "${algorithm}" in JWT header`),
      );
    },
  );

  it('should throw an error if the token is expired', async () => {
    const { publicKey, jwt } = await generateKeysAndJwt({
      ...mockJwtOptions,
      expiryDate: new Date('01/01/2024'),
    });
    vi.mocked(decodeProtectedHeader).mockReturnValue(mockProtectedHeaders);
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);
    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues: configValues,
      }),
    ).rejects.toThrow('"exp" claim timestamp check failed');
  });

  it('should throw an error if the app ID is not known', async () => {
    const { publicKey, jwt } = await generateKeysAndJwt({
      ...mockJwtOptions,
      payload: { ...mockJwtOptions.payload, sub: 'invalid' },
    });
    vi.mocked(decodeProtectedHeader).mockReturnValue(mockProtectedHeaders);
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);
    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues: configValues,
      }),
    ).rejects.toThrow(UnknownAppError);
  });

  it('should throw an error if issuer is invalid', async () => {
    const { publicKey, jwt } = await generateKeysAndJwt({
      ...mockJwtOptions,
      issuer: 'invalid',
    });

    const expectedPayload = {
      aud: mockJwtOptions.audience,
      exp: Math.floor(mockJwtOptions.expiryDate.getTime() / 1000),
      iat: Math.floor(new Date().getTime() / 1000),
      jti: mockJwtOptions.jti,
      iss: 'invalid',
      ...mockJwtPayload,
    };
    vi.mocked(decodeProtectedHeader).mockReturnValue(mockProtectedHeaders);
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);
    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues: configValues,
      }),
    ).rejects.toThrow(
      new JWTClaimValidationFailed(
        'unexpected "iss" claim value',
        expectedPayload,
        'iss',
        'check_failed',
      ),
    );
  });

  it.each([{ audience: 'invalid' }, { audience: ['invalid', 'test'] }])(
    'should throw an error if audience is invalid',
    async ({ audience }) => {
      const { publicKey, jwt } = await generateKeysAndJwt({
        ...mockJwtOptions,
        audience,
      });
      vi.mocked(decodeProtectedHeader).mockReturnValue(mockProtectedHeaders);
      vi.mocked(fetchJwks).mockResolvedValue(publicKey);
      await expect(
        validateFirebaseJWT({
          token: jwt,
          configValues: configValues,
        }),
      ).rejects.toThrow(new JwtError('Invalid "aud" claim in the JWT payload'));
    },
  );

  it.each([
    'key1|/usr/bin/uname',
    '../../../../../../dev/null',
    "SELECT key FROM keys WHERE key='key1'",
  ])('should throw an error if kid contains harmful content', async (kid) => {
    const { publicKey, jwt } = await generateKeysAndJwt({
      ...mockJwtOptions,
      issuer: 'invalid',
    });
    vi.mocked(decodeProtectedHeader).mockReturnValue({
      ...mockProtectedHeaders,
      kid,
    });
    vi.mocked(fetchJwks).mockResolvedValue(publicKey);

    await expect(
      validateFirebaseJWT({
        token: jwt,
        configValues: configValues,
      }),
    ).rejects.toThrow(
      new JwtError(
        '"kid" header is in unsafe format',
        `"kid" header is in unsafe format "${kid}"`,
      ),
    );
  });
});
