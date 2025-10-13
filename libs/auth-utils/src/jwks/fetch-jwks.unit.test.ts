import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchJwks } from './fetch-jwks';
import { sendHttpRequest } from '@libs/http-utils';
import { isCryptoKey } from 'util/types';

vi.mock('@libs/http-utils');

const testCacheKey = 'TEST_JWKS';
const testJwksUrl = 'https://www.test.url/jwks';
const testAlgorithm = 'RS256';
const testKid = 'test-key-id';
const testJwksKeys = {
  keys: [
    {
      alg: testAlgorithm,
      kid: testKid,
      kty: 'RSA',
      use: 'sig',
      e: 'AQAB',
      n: 'modulus',
    },
  ],
};

describe('GIVEN a request to Fetch JWKS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('WHEN the JWKS is not cached', () => {
    it('AND the call to request to fetch the JWKS fails THEN an error is thrown', async () => {
      vi.mocked(sendHttpRequest).mockRejectedValue(
        new Error('Could not retrieve JWKS'),
      );

      await expect(
        fetchJwks(testCacheKey, testJwksUrl, { alg: testAlgorithm }),
      ).rejects.toThrow('Could not retrieve JWKS');
    });
    it('AND the call to the Jwks Succeeds THEN the jwks CryptoKey is returned', async () => {
      vi.mocked(sendHttpRequest).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testJwksKeys),
      } as unknown as Response);

      const jwks = await fetchJwks(testCacheKey, testJwksUrl, {
        alg: testAlgorithm,
      });
      expect(sendHttpRequest).toBeCalledTimes(1);
      expect(isCryptoKey(jwks)).toBeTruthy();
    });
  });

  describe('WHEN the JWKS is cached', () => {
    beforeEach(async () => {
      //Prefill response for cache
      vi.mocked(sendHttpRequest).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testJwksKeys),
      } as unknown as Response);
      await fetchJwks(testCacheKey, testJwksUrl, { alg: testAlgorithm });
      //Reset mocks so counters starts from 0
      vi.resetAllMocks();
    });

    it('THEN it returns the cached value', async () => {
      const jwks = await fetchJwks(testCacheKey, testJwksUrl, {
        alg: testAlgorithm,
      });
      expect(sendHttpRequest).toBeCalledTimes(0);
      expect(isCryptoKey(jwks)).toBeTruthy();
    });

    it('AND the cache is expired THEN the jwks is fetched and returned', async () => {
      vi.setSystemTime(new Date('02/01/2025'));
      vi.mocked(sendHttpRequest).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testJwksKeys),
      } as unknown as Response);

      const jwks = await fetchJwks(testCacheKey, testJwksUrl, {
        alg: testAlgorithm,
      });
      expect(sendHttpRequest).toBeCalledTimes(1);
      expect(isCryptoKey(jwks)).toBeTruthy();
    });
  });
});
