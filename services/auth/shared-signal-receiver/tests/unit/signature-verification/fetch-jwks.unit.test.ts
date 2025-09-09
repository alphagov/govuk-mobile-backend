import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { getJwks } from '../../../signature-verification/fetch-jwks';

const validKeyId = 'test-key-id';
const mockJwks = {
  keys: [
    {
      kid: validKeyId,
      use: 'sig',
      kty: 'RSA',
      e: 'AQAB',
      n: 'modulus',
    },
  ],
};

describe('fetchJwks', () => {
  const jwksUri = 'https://example.com/jwks.json';
  const cacheDurationMs = 11 * 60 * 1000;
  const eventAlgorithm = 'RS256';
  describe('Given a valid JWKS endpoint', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    describe('And the resolver function has not been cached', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      describe('When the call to the JWKS endpoint is made', () => {
        let mockFetch;
        beforeAll(async () => {
          mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: {
              get: vi.fn().mockReturnValue(null),
            },
            json: async () => mockJwks,
          } as unknown as Response);
          await getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: validKeyId,
            eventAlgorithm,
          });
        });

        it('Uses the custom http handler', () => {
          expect(mockFetch).toHaveBeenCalledOnce();
        });

        it('Re-uses the existing resolver on subsequent calls', async () => {
          await getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: validKeyId,
            eventAlgorithm,
          });
          expect(mockFetch).toHaveBeenCalledOnce();
        });
      });
    });

    describe('When the kid is mismatched', () => {
      let mockFetch;

      beforeAll(async () => {
        mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: vi.fn().mockReturnValue(null),
          },
          json: async () => mockJwks,
        } as unknown as Response);
      });

      afterAll(() => vi.resetAllMocks());

      it('Throws an exception', async () => {
        await expect(
          getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: 'unknown',
            eventAlgorithm,
          }),
        ).rejects.toThrowError(
          'no applicable key found in the JSON Web Key Set',
        );
      });
    });

    describe('And the JWKS has been cached', () => {
      describe('When the JWKS cache expires', () => {
        let mockFetch;
        beforeAll(async () => {
          mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: {
              get: vi.fn().mockReturnValue(null),
            },
            json: async () => mockJwks,
          } as unknown as Response);
          vi.useFakeTimers();
        });

        it('Re-fetches the JWKS from remote', async () => {
          await getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: validKeyId,
            jwksResolver: null,
            eventAlgorithm,
          });

          vi.setSystemTime(Date.now());
          vi.advanceTimersByTime(cacheDurationMs + 1000);

          await getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: validKeyId,
            eventAlgorithm,
          });
          expect(mockFetch).toHaveBeenCalledTimes(2);
        });
      });
    });

    it('The algorithm should be configurable', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
        json: async () => mockJwks,
      } as unknown as Response);

      await expect(
        getJwks({
          jwksUri,
          cacheDurationMs,
          requestFn: mockFetch,
          kid: validKeyId,
          eventAlgorithm: 'PS256',
        }),
      ).resolves.toBeDefined();
    });
  });

  describe.each([400, 401, 429, 500, 501, 502, 503])(
    'When the call to the JWKS endpoint returns a %s',
    (status) => {
      it('Throws an exception', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status,
        } as unknown as Response);

        await expect(
          getJwks({
            jwksUri,
            cacheDurationMs,
            requestFn: mockFetch,
            kid: 'unknown',
            jwksResolver: null,
            eventAlgorithm,
          }),
        ).rejects.toThrowError(
          'Expected 200 OK from the JSON Web Key Set HTTP response',
        );
      });
    },
  );
});
