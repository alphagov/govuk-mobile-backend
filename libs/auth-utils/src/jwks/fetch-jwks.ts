import type { CryptoKey, JWSHeaderParameters } from 'jose';
import { createRemoteJWKSet, customFetch } from 'jose';
import { sendHttpRequest } from '@libs/http-utils';

const cacheDurationMs = 21600000; //6 hours -> 6*60*60*1000;
const jwksCache: JWKSCache = {};

type JWKSCache = Record<string, { jwks: CryptoKey; expiresAt: number }>;

/**
 * Returns a valid CryptoKey that can be used for Jose JWT verification & validation purposes. May contain multiple keys.
 * @param cacheKey - The name of the cache key to use a cached value (e.g: 'firebaseJwks')
 * @param jwksUri - The URI of the well known JWKS endpoint to use
 * @param protectedHeaders - The JWS protected headers for Jose to evaluate the keys to select with
 * @param token
 * @returns CryptoKey
 */
const fetchJwks = async (
  cacheKey: string,
  jwksUri: string,
  protectedHeaders?: JWSHeaderParameters,
): Promise<CryptoKey> => {
  const cachedJwks = jwksCache[cacheKey];

  console.log(cachedJwks?.expiresAt);
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.jwks;
  }

  const jwks = await createRemoteJWKSet(new URL(jwksUri), {
    [customFetch]: async (url) => {
      return sendHttpRequest(url, {});
    },
  })(protectedHeaders);
  const expiresAt = new Date().getTime() + cacheDurationMs;
  jwksCache[cacheKey] = {
    jwks,
    expiresAt,
  };

  return jwks;
};

export { fetchJwks };
