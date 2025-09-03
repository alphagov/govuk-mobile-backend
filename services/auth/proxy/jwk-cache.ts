/* eslint-disable importPlugin/group-exports */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { JwksFetchError } from './errors';
import { logMessages } from './log-messages';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/naming-convention
const JWKS_URI = 'https://firebaseappcheck.googleapis.com/v1/jwks';

interface Key {
  kid: string;
  nbf?: number;
  use: string;
  kty: string;
  e: string;
  n: string;
}

interface JwksCache {
  jwks: Jwks;
  expiresInMillis: number;
}

const isJwks = (responseJson: unknown): responseJson is Jwks => {
  return (
    typeof responseJson === 'object' &&
    responseJson !== null &&
    Array.isArray((responseJson as { keys?: unknown }).keys)
  );
};

let cachedJwks: JwksCache | null = null;

interface Jwks {
  keys: Key[];
}

export const getJwks = async (): Promise<Jwks> => {
  const now = Date.now();
  const timeoutInMillis =
    process.env['PROXY_TIMEOUT_MS'] != null
      ? parseInt(process.env['PROXY_TIMEOUT_MS'], 10)
      : 3000;

  // Check if cachedJwks exists and is still fresh based on its maxAge
  if (cachedJwks && now < cachedJwks.expiresInMillis) {
    logger.info(logMessages.JWKS_FETCHING_FROM_CACHE);
    return cachedJwks.jwks;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, timeoutInMillis);

  let response = undefined;
  try {
    response = await fetch(JWKS_URI, {
      signal: abortController.signal,
    });
  } catch (error) {
    logger.error(
      logMessages.JWKS_FETCHING_FAILED,
      `Error fetching JWKS: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw new JwksFetchError('Failed to fetch JWKS');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    logger.error(
      logMessages.JWKS_FETCHING_FAILED,
      `Failed to fetch JWKS: ${String(response.status)} ${response.statusText}`,
    );
    throw new JwksFetchError('Failed to fetch JWKS');
  }

  const jwksResponse = await response.json();

  if (!isJwks(jwksResponse)) {
    throw new JwksFetchError('Jwks response is not valid Jwks');
  }

  // Get max-age from cache-control header
  const cacheControlHeader = response.headers.get('cache-control');
  let maxAgeInSeconds = 6 * 60 * 60; //defaulting to six hours in seconds
  if (cacheControlHeader != undefined) {
    const match = /max-age=(\d+)/.exec(cacheControlHeader); //reading value e.g. public, max-age=21600
    if (match?.[1] != null) {
      maxAgeInSeconds = parseInt(match[1], 10);
    }
  }

  const expiry = Date.now() + maxAgeInSeconds * 1000; //in milliseconds

  cachedJwks = {
    jwks: jwksResponse,
    expiresInMillis: expiry,
  };

  logger.info(logMessages.JWKS_FETCHING_FRESH_KEYS);

  return cachedJwks.jwks;
};

//Only for testing purposes due to singleton nature of the object
export const _clearCachedJwks = (): void => {
  cachedJwks = null;
};

export const _returnCachedJwks = (): JwksCache | null => {
  return cachedJwks;
};
