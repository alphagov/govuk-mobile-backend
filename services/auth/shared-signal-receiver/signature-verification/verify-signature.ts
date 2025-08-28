import { SignatureVerificationError } from '../errors';
import { logMessages } from '../log-messages';
import { getJwks } from './fetch-jwks';
import type { JWTPayload } from 'jose';
import { decodeProtectedHeader, jwtVerify } from 'jose';

export interface SharedSignalsConfig {
  audience: string;
  issuer: string;
  jwksUri: string;
  cacheDurationMs: number;
  eventAlgorithm: string;
}

export interface VerifySetJwtInput {
  jwt: unknown;
  fetchJwks?: typeof getJwks;
  config: SharedSignalsConfig;
}

export const verifySETJwt = async ({
  config,
  jwt,
  fetchJwks = getJwks,
}: VerifySetJwtInput): Promise<JWTPayload> => {
  try {
    if (typeof jwt !== 'string') {
      throw new TypeError('Invalid jwt type');
    }

    const decodedHeaders = decodeProtectedHeader(jwt);

    if (decodedHeaders.kid == null) {
      throw new TypeError('JWT is missing the "kid" header');
    }

    const keys = await fetchJwks({
      ...config,
      kid: decodedHeaders.kid,
    });

    const { payload } = await jwtVerify(jwt, keys, {
      audience: config.audience,
      issuer: config.issuer,
      algorithms: [config.eventAlgorithm],
      typ: 'secevent+jwt',
    });

    console.log(logMessages.SET_TOKEN_VERIFIED);

    return payload;
  } catch (error) {
    throw new SignatureVerificationError(String(error));
  }
};
