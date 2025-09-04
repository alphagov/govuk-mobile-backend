import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { validateFirebaseJWT } from '../../firebaseJwt';
import { decode } from 'jsonwebtoken';
import { UnknownAppError, JwtError } from '../../errors';
import { AppConfig } from '../../config';

const configValues: AppConfig = {
  firebaseIosAppId: 'mocked-app-id',
  firebaseAndroidAppId: 'mocked-app-id',
  projectId: 'mocked-project-id',
  audience: 'mocked-audience',
  cognitoUrl: new URL('https://mocked-cognito-url.com'),
};

vi.mock('jsonwebtoken', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('jsonwebtoken')>();

  return {
    ...originalModule, // Include all original exports
    verify: vi.fn((token, secretOrPublicKey, options, callback) => {
      if (token === 'valid-token') {
        callback(null, {
          sub: configValues.firebaseAndroidAppId,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: `https://firebaseappcheck.googleapis.com/${configValues.projectId}`,
          aud: [`projects/${configValues.projectId}`],
        });
      } else if (token === 'invalid-app-id') {
        callback(null, {
          sub: 'invalid-app-id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: `https://firebaseappcheck.googleapis.com/${configValues.projectId}`,
          aud: [`projects/${configValues.projectId}`],
        });
      } else if (token === 'invalid-issuer') {
        callback(null, {
          sub: configValues.firebaseIosAppId,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: 'https://invalid-issuer.com',
          aud: [`projects/${configValues.projectId}`],
        });
      } else if (token === 'invalid audience') {
        callback(null, {
          sub: configValues.firebaseIosAppId,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: `https://firebaseappcheck.googleapis.com/${configValues.projectId}`,
          aud: ['invalid-audience'],
        });
      } else if (token === 'expired-token') {
        callback(new JwtError('Token expired'));
      } else {
        callback(new JwtError('Invalid token'));
      }
    }),
    decode: vi.fn().mockReturnValue({
      sub: 'mocked-app-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      header: {
        alg: 'RS256',
        kid: 'mocked-kid',
        typ: 'JWT',
      },
    }),
    JwtError: class extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'JwtError';
      }
    },
  };
});

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: vi.fn().mockReturnValue('public, max-age=21600'), // 6 hour
    },
    json: () =>
      Promise.resolve({
        keys: [
          {
            kty: 'RSA',
            alg: 'RS256',
            use: 'sig',
            kid: 'mocked-kid',
            n: 'mocked-n',
            e: 'mocked-e',
          },
        ],
      }),
  }),
);

vi.mock('jwk-to-pem', () => ({
  __esModule: true,
  default: vi.fn(() => 'mocked-public-key'),
}));

describe('firebaseJwt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error if the JWKS fetch fails', async () => {
    // Mock fetch to simulate a network error
    (global.fetch as Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }),
    );

    await expect(
      validateFirebaseJWT({
        token: 'valid-token',
        configValues,
      }),
    ).rejects.toThrow('Jwks response is not valid Jwks');
  });

  it('should throw an error if jwt is not a valid JwtPayload', async () => {
    (decode as Mock).mockReturnValueOnce('not-an-object'); //not a valid JwtPayload object

    await expect(
      validateFirebaseJWT({
        token: 'valid-token',
        configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it('should throw an error when typ is not JWT ', async () => {
    (decode as Mock).mockReturnValueOnce({
      sub: 'mocked-app-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      header: {
        alg: 'RS256',
        kid: 'mocked-kid',
        typ: 'not-JWT', // Invalid type
      },
    });

    await expect(
      validateFirebaseJWT({
        token: 'valid-token',
        configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it('should return void for a valid token', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'valid-token',
        configValues: configValues,
      }),
    ).resolves.toBeUndefined();
  });

  it('should throw an error if kid is not found', async () => {
    (decode as Mock).mockReturnValueOnce({
      sub: 'mocked-app-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      header: {
        alg: 'RS256',
      },
    });

    await expect(
      validateFirebaseJWT({
        token: 'valid-token',
        configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it.each(['HS256', 'HS384', 'HS512', 'None'])(
    'should throw an error when Algorithm is %s',
    async (algorithm) => {
      (decode as Mock).mockReturnValueOnce({
        sub: 'mocked-app-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        header: {
          kid: 'mocked-kid',
          alg: algorithm, // Invalid algorithm
        },
      });

      await expect(
        validateFirebaseJWT({
          token: 'valid-token',
          configValues,
        }),
      ).rejects.toThrow(JwtError);
    },
  );

  it('should throw an error if the token is invalid', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'invalid-token',
        configValues: configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it('should throw an error if the token is expired', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'expired-token',
        configValues: configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it('should throw an error if the app ID is not known', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'invalid-app-id',
        configValues: configValues,
      }),
    ).rejects.toThrow(UnknownAppError);
  });

  it('should throw an error if issuer is invalid', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'invalid-issuer',
        configValues: configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it('should throw an error if audience is invalid', async () => {
    await expect(
      validateFirebaseJWT({
        token: 'invalid-audience',
        configValues: configValues,
      }),
    ).rejects.toThrow(JwtError);
  });

  it.each([
    'key1|/usr/bin/uname',
    '../../../../../../dev/null',
    "SELECT key FROM keys WHERE key='key1'",
  ])('should throw an error if kid contains harmful content', async (kid) => {
    (decode as Mock).mockReturnValueOnce({
      sub: 'mocked-app-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      header: {
        kid: kid,
        alg: 'RS256',
        typ: 'JWT',
      },
    });

    await expect(
      validateFirebaseJWT({
        token: 'invalid-audience',
        configValues: configValues,
      }),
    ).rejects.toThrow(
      new JwtError(
        '"kid" header is in unsafe format',
        `"kid" header is in unsafe format "${kid}"`,
      ),
    );
  });

  it.each(['F_NePg', 'j7Oozg', 'D_o00g', 'kLTLjA', '00yavg'])(
    'should allow valid values',
    async (kid) => {
      (decode as Mock).mockReturnValueOnce({
        sub: 'mocked-app-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        header: {
          kid: kid,
          alg: 'RS256',
          typ: 'JWT',
        },
      });

      await expect(
        validateFirebaseJWT({
          token: 'invalid-audience',
          configValues: configValues,
        }),
      ).rejects.toThrow(
        new JwtError(
          'No matching key found for kid',
          `No matching key found for kid "${kid}"`,
        ),
      );
    },
  );
});
