import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _clearCachedJwks, getJwks, _returnCachedJwks } from '../../jwk-cache';
import { logger } from '../../logger';
import { logMessages } from '../../log-messages';
import * as httpService from '../../../http/http-service';

const mockJwks = {
  keys: [
    {
      kid: 'test-key-id',
      use: 'sig',
      kty: 'RSA',
      e: 'AQAB',
      n: 'modulus',
    },
  ],
};

describe('getJwks', () => {
  const httpServiceSpy = vi.spyOn(httpService, 'sendHttpRequest');
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    _clearCachedJwks(); // reset the cache on each run

    process['PROXY_TIMEOUT_MS'] = '100'; //setting proxy timeout
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  it('defaults to 6 hours cache expiry if cache-control header is missing', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue(null), // No cache-control header
      },
    };
    httpServiceSpy.mockResolvedValueOnce(mockedResponse as any);

    const now = Date.now();
    vi.setSystemTime(now);

    const expected = now + 6 * 60 * 60 * 1000; // default 6 hours to current time

    await getJwks();
    expect(httpServiceSpy).toHaveBeenCalledOnce();
    expect(_returnCachedJwks()?.expiresInMillis).toBe(expected);
  });

  it('returns cached JWKS on second call', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=21600'), // 6 hour
      },
    };

    httpServiceSpy.mockResolvedValueOnce(mockedResponse as any);

    await getJwks(); // first call

    const now = Date.now();
    vi.setSystemTime(now);
    const expectedExpiryAtInMs = now + 21600 * 1000;
    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // simulate time passage by 2 hours (2 hours in milliseconds)

    const result = await getJwks(); // should use cache for second call
    expect(result).toEqual(mockJwks);
    expect(httpServiceSpy).toHaveBeenCalledOnce(); //fetch is called once only
    expect(_returnCachedJwks()?.expiresInMillis).toBe(expectedExpiryAtInMs);
  });

  it('re-fetches JWKS after cache expires', async () => {
    const firstResponse = {
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hr expiry
      },
    };

    const secondResponse = {
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hr expiry on the new call
      },
    };

    httpServiceSpy
      .mockResolvedValueOnce(firstResponse as any)
      .mockResolvedValueOnce(secondResponse as any);

    await getJwks(); // first fetch

    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // expire cache in 2 hr in milliseconds

    await getJwks(); // should refetch

    expect(httpServiceSpy).toHaveBeenCalledTimes(2);
  });

  it('uses max-age from cache-control header to set cache expiry', async () => {
    const mockedResponse = {
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hour
      },
    };

    httpServiceSpy.mockResolvedValueOnce(mockedResponse as any);

    const now = Date.now();
    vi.setSystemTime(now);

    await getJwks(); // fetch and cache

    expect(httpServiceSpy).toHaveBeenCalledOnce();
    expect(_returnCachedJwks()?.expiresInMillis).toBe(now + 3600 * 1000);
  });

  it('throws on failed fetch', async () => {
    const mockedLogger = vi.spyOn(logger, 'error');

    const failedResponse = {
      ok: false,
      status: 500,
      statusText: 'Error',
    };
    httpServiceSpy.mockResolvedValueOnce(failedResponse as any);
    mockedLogger.mockImplementation(() => {
      // Mock implementation to suppress logging during tests
    });

    await expect(getJwks()).rejects.toThrow('Failed to fetch JWKS');
    expect(mockedLogger).toHaveBeenCalledExactlyOnceWith(
      logMessages.JWKS_FETCHING_FAILED,
      'Failed to fetch JWKS: 500 Error',
    );
  });

  it('throws JwksFetchError on invalid response', async () => {
    const invalidResponse = {
      ok: true,
      json: async () => ({ not: 'valid' }),
    };

    httpServiceSpy.mockResolvedValueOnce(invalidResponse as any);

    await expect(getJwks()).rejects.toThrow('Jwks response is not valid Jwks');
  });

  it('With abort fetch error', async () => {
    const errorLoggerSpy = vi.spyOn(logger, 'error');
    const abortedResponse = {
      ok: false,
      status: 408, //timeout response
      statusText: 'AbortError',
    };

    errorLoggerSpy.mockImplementation(() => {
      // Mock implementation to suppress logging during tests
    });

    httpServiceSpy.mockResolvedValueOnce(abortedResponse as any);

    await expect(getJwks()).rejects.toThrow('Failed to fetch JWKS');

    expect(httpServiceSpy).toHaveBeenCalledOnce();
    expect(errorLoggerSpy).toHaveBeenCalledExactlyOnceWith(
      logMessages.JWKS_FETCHING_FAILED,
      'Failed to fetch JWKS: 408 AbortError',
    );
  });
});
