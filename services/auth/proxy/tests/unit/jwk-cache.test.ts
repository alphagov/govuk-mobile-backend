import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _clearCachedJwks, getJwks, _returnCachedJwks } from '../../jwk-cache';

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
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    _clearCachedJwks(); // reset the cache on each run
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('defaults to 6 hours cache expiry if cache-control header is missing', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue(null), // No cache-control header
      },
    });

    const now = Date.now();
    vi.setSystemTime(now);

    const expected = now + 6 * 60 * 60 * 1000; // default 6 hours to current time

    await getJwks();
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(_returnCachedJwks()?.expiresInMillis).toBe(expected);
  });

  it('returns cached JWKS on second call', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=21600'), // 6 hour
      },
    });

    await getJwks(); // first call

    const now = Date.now();
    vi.setSystemTime(now);
    const expectedExpiryAtInMs = now + 21600 * 1000;
    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // simulate time passage by 2 hours (2 hours in milliseconds)

    const result = await getJwks(); // should use cache for second call
    expect(result).toEqual(mockJwks);
    expect(fetch).toHaveBeenCalledOnce(); //fetch is called once only
    expect(_returnCachedJwks()?.expiresInMillis).toBe(expectedExpiryAtInMs);
  });

  it('re-fetches JWKS after cache expires', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwks,
        headers: {
          get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hr expiry
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwks,
        headers: {
          get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hr expiry on the new call
        },
      });

    await getJwks(); // first fetch

    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // expire cache in 2 hr in milliseconds

    await getJwks(); // should refetch

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses max-age from cache-control header to set cache expiry', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJwks,
      headers: {
        get: vi.fn().mockReturnValue('public, max-age=3600'), // 1 hour
      },
    });

    const now = Date.now();
    vi.setSystemTime(now);

    await getJwks(); // fetch and cache
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('throws on failed fetch', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Error',
    });

    await expect(getJwks()).rejects.toThrow('Failed to fetch JWKS');
  });

  it('throws JwksFetchError on invalid response', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ not: 'valid' }),
    });

    await expect(getJwks()).rejects.toThrow('Jwks response is not valid Jwks');
  });
});
