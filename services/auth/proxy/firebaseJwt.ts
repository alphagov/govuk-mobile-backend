import { JwtError, UnknownAppError } from './errors';
import type { AppConfig } from './config';
import { logger } from './logger';
import { logMessages } from './log-messages';
import type { JWTPayload } from 'jose';
import { decodeProtectedHeader } from 'jose';
import { fetchJwks, verifyJwt } from '@libs/auth-utils';

// eslint-disable-next-line @typescript-eslint/naming-convention
const JWKS_URI = 'https://firebaseappcheck.googleapis.com/v1/jwks';
// eslint-disable-next-line @typescript-eslint/naming-convention
const RS256 = 'RS256';

const isKnownApp = (payload: JWTPayload, firebaseAppIds: string[]): boolean => {
  return (
    'sub' in payload &&
    typeof payload.sub === 'string' &&
    firebaseAppIds.includes(payload.sub)
  );
};

const isAlgorithmValid = (suppliedAlgo: string): boolean => {
  return suppliedAlgo === RS256;
};

interface ValidateFirebase {
  token: string;
  configValues: AppConfig;
}

const hasValidIss = (
  payload: object,
  firebaseProjectNumber: string,
): payload is JWTPayload =>
  'iss' in payload &&
  typeof payload.iss === 'string' &&
  payload.iss ===
    `https://firebaseappcheck.googleapis.com/${firebaseProjectNumber}`;

const hasCorrectAudiences = (
  payload: Record<string, unknown> | JWTPayload,
  configValues: AppConfig,
): boolean => {
  const audiences: string[] = [
    `projects/${configValues.audience}`,
    `projects/${configValues.projectId}`,
  ];

  const incomingAudience = payload.aud;
  console.log(incomingAudience);

  return Array.isArray(incomingAudience)
    ? incomingAudience.some((aud: string) => audiences.includes(aud))
    : false;
};

const hasValidAud = (
  payload: object,
  configValues: AppConfig,
): payload is JWTPayload =>
  'aud' in payload && hasCorrectAudiences(payload, configValues);

const isKidFormatSafe = (kid: string): boolean => {
  // Allows alphanumeric characters, hyphens, and underscores
  const kidRegex = /^[a-zA-Z0-9_-]+$/;
  return kidRegex.test(kid);
};

export const validateFirebaseJWT = async (
  values: ValidateFirebase,
): Promise<void> => {
  const decodedTokenHeader = decodeProtectedHeader(values.token);
  const { kid, alg, typ } = decodedTokenHeader;

  if (kid == null) {
    throw new JwtError(
      'JWT is missing the "kid" header',
      'kid header is missing',
    );
  }
  if (alg == null) {
    throw new JwtError(
      'JWT is missing the "alg" header',
      'alg header is missing',
    );
  }
  if (typ == null) {
    throw new JwtError(
      'JWT is missing the "typ" header',
      'typ header is missing',
    );
  }

  if (!isKidFormatSafe(kid)) {
    throw new JwtError(
      '"kid" header is in unsafe format',
      `"kid" header is in unsafe format "${kid}"`,
    );
  }

  if (!isAlgorithmValid(alg)) {
    throw new JwtError(`Invalid algorithm "${alg}" in JWT header`);
  }

  if (typ !== 'JWT') {
    throw new JwtError('JWT "typ" header has an invalid type');
  }

  const jwks = await fetchJwks(kid, JWKS_URI, decodedTokenHeader);
  const payload = await verifyJwt(values.token, jwks, {
    algorithms: [RS256],
  });

  if (
    !isKnownApp(payload, [
      values.configValues.firebaseAndroidAppId,
      values.configValues.firebaseIosAppId,
    ])
  ) {
    throw new UnknownAppError('Unknown app associated with attestation token');
  }

  if (!hasValidIss(payload, values.configValues.projectId)) {
    throw new JwtError('Invalid "iss" claim in the JWT payload');
  }

  if (!hasValidAud(payload, values.configValues)) {
    throw new JwtError('Invalid "aud" claim in the JWT payload');
  }

  logger.info(logMessages.ATTESTATION_TOKEN_VALID);
};
