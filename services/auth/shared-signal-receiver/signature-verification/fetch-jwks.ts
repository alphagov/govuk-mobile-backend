import type { CryptoKey, FlattenedJWSInput, JWSHeaderParameters } from 'jose';

import { createRemoteJWKSet, customFetch } from 'jose';
import type { RetryConfig } from '../../http/http-service';
import { sendHttpRequest } from '../../http/http-service';

type JWKSResolver = (
  protectedHeader?: JWSHeaderParameters,
  jwt?: FlattenedJWSInput,
) => Promise<CryptoKey>;

let cachedResolver: JWKSResolver | null = null; // Store the resolver for reuse - this holds JWKS local cache

interface FetchJwksInput {
  jwksUri: string;
  kid: string;
  cacheDurationMs: number;
  eventAlgorithm: string;
  requestFn?: typeof sendHttpRequest;
  jwksResolver?: JWKSResolver | null;
}

export const getJwks = async ({
  jwksUri,
  kid,
  cacheDurationMs,
  eventAlgorithm,
  requestFn = sendHttpRequest,
  jwksResolver = cachedResolver,
}: FetchJwksInput): Promise<CryptoKey> => {
  const timeout = process.env['SHARED_SIGNAL_TIMEOUT'] ?? '5000'; // default to 5 seconds
  const retryConfig: RetryConfig = {
    timeoutInMs: Number(timeout),
  };
  if (jwksResolver) {
    return jwksResolver({
      alg: eventAlgorithm,
      kid,
    });
  } else {
    cachedResolver = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: cacheDurationMs,
      [customFetch]: async (url, { headers, method }) => {
        return requestFn(
          url,
          {
            method,
            headers,
          },
          retryConfig,
        );
      },
    });

    return cachedResolver({
      alg: eventAlgorithm,
      kid,
    });
  }
};
