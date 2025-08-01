import type { CryptoKey, FlattenedJWSInput, JWSHeaderParameters } from 'jose';

import { createRemoteJWKSet, customFetch } from 'jose';
import { sendHttpRequest } from '../common/http/sendHttpRequest';

type JWKSResolver = (
  protectedHeader?: JWSHeaderParameters,
  jwt?: FlattenedJWSInput,
) => Promise<CryptoKey>;

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const tenMinutes = 10 * 60 * 1000;

let cachedResolver: JWKSResolver | null = null; // Store the resolver for reuse - this holds JWKS local cache

interface FetchJwksInput {
  jwksUri: string;
  kid: string;
  requestFn?: typeof sendHttpRequest;
  jwksResolver?: JWKSResolver | null;
}

export const getJwks = async ({
  jwksUri,
  kid,
  requestFn = sendHttpRequest,
  jwksResolver = cachedResolver,
}: FetchJwksInput): Promise<CryptoKey> => {
  if (jwksResolver) {
    return jwksResolver({
      alg: 'RS256',
      kid,
    });
  } else {
    cachedResolver = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: tenMinutes,
      [customFetch]: async (url, { headers, method }) => {
        return requestFn(url, {
          method,
          headers,
        });
      },
    });

    return cachedResolver({
      alg: 'RS256',
      kid,
    });
  }
};
