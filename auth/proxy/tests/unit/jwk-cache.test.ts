import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _clearCachedJwks, getJwks } from '../../jwk-cache'; 
import { JwksFetchError } from './../../errors';

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
  let fetchSpy: ReturnType<typeof vi.fn>
  
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

  it('fetches JWKS and caches it', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJwks,
    });

    const result = await getJwks();
    expect(result).toEqual(mockJwks);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('returns cached JWKS on second call', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJwks,
    });

    await getJwks(); // first call
    vi.advanceTimersByTime(2 * 60 * 1000); // simulate time passage
    const result = await getJwks(); // should use cache
    expect(result).toEqual(mockJwks);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('re-fetches JWKS after cache expires', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockJwks })
      .mockResolvedValueOnce({ ok: true, json: async () => mockJwks });

    await getJwks(); // first fetch
    vi.advanceTimersByTime(6 * 60 * 1000); // expire cache
    await getJwks(); // should refetch
    expect(fetch).toHaveBeenCalledTimes(2);
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
