import {
  SignatureVerificationError,
  InvalidRequestError,
  InvalidKeyError,
} from '../errors';
import { logMessages } from '../log-messages';
import { getJwks } from './fetch-jwks';
import type { JWTPayload } from 'jose';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { logger } from '../logger';

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
      throw new InvalidRequestError(`The jwt is not a string`);
    }

    const decodedHeaders = decodeProtectedHeader(jwt);

    if (decodedHeaders.kid == null) {
      throw new InvalidKeyError(
        'One or more keys used to encrypt or sign the SET is invalid or otherwise unacceptable to the SET Recipient (expired, revoked, failed certificate validation, etc.).',
      );
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

    logger.info(logMessages.SET_TOKEN_VERIFIED);

    return payload;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof InvalidRequestError:
      case error instanceof InvalidKeyError:
        throw error;
      default:
        throw new SignatureVerificationError(String(error));
    }
  }
};
