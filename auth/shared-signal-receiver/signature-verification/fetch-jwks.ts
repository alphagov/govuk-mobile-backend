import type { CryptoKey, FlattenedJWSInput, JWSHeaderParameters } from 'jose';

import { createRemoteJWKSet, customFetch } from 'jose';
import { sendHttpRequest } from '../common/http/sendHttpRequest';

type JWKSResolver = (
  protectedHeader?: JWSHeaderParameters,
  jwt?: FlattenedJWSInput,
) => Promise<CryptoKey>;

let cachedResolver: JWKSResolver | null = null; // Store the resolver for reuse - this holds JWKS local cache

interface FetchJwksInput {
  jwksUri: string;
  kid: string;
  cacheDurationMs: number;
  requestFn?: typeof sendHttpRequest;
  jwksResolver?: JWKSResolver | null;
}

export const getJwks = async ({
  jwksUri,
  kid,
  cacheDurationMs,
  requestFn = sendHttpRequest,
  jwksResolver = cachedResolver,
}: FetchJwksInput): Promise<CryptoKey> => {
  if (jwksResolver) {
    return jwksResolver({
      alg: 'PS256',
      kid,
    });
  } else {
    cachedResolver = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: cacheDurationMs,
      [customFetch]: async (url, { headers, method }) => {
        return requestFn(url, {
          method,
          headers,
        });
      },
    });

    return cachedResolver({
      alg: 'PS256',
      kid,
    });
  }
};
