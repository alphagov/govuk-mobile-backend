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
  describe('Given a valid JWKS endpoint', () => {
    afterEach(() => {
      vi.useRealTimers();
      // vi.resetAllMocks();
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
            requestFn: mockFetch,
            kid: validKeyId,
          });
        });

        it('Uses the custom http handler', () => {
          expect(mockFetch).toHaveBeenCalledOnce();
        });

        it('Re-uses the existing resolver on subsequent calls', async () => {
          await getJwks({
            jwksUri,
            requestFn: mockFetch,
            kid: validKeyId,
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
            requestFn: mockFetch,
            kid: 'unknown',
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
            requestFn: mockFetch,
            kid: validKeyId,
            jwksResolver: null,
          });

          vi.setSystemTime(Date.now());
          vi.advanceTimersByTime(11 * 60 * 1000);

          await getJwks({
            jwksUri,
            requestFn: mockFetch,
            kid: validKeyId,
          });
          expect(mockFetch).toHaveBeenCalledTimes(2);
        });
      });
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
            requestFn: mockFetch,
            kid: 'unknown',
            jwksResolver: null,
          }),
        ).rejects.toThrowError(
          'Expected 200 OK from the JSON Web Key Set HTTP response',
        );
      });
    },
  );
});
