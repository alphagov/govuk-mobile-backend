
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { MissingAttestationTokenError } from './errors';
import { validateFirebaseJWT } from './firebaseJwt';
import type { Config } from './config';

export interface AttestationUseCase {
  validateAttestationHeaderOrThrow: (headers: APIGatewayProxyEventHeaders, path: string, config: Config) => Promise<void>
}

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * @param headers 
 * @param path
 * @param config
 * @returns 
 * @throws {MissingAttestationTokenError} 
 */
export const validateAttestationHeaderOrThrow = async (
  headers: APIGatewayProxyEventHeaders,
  path: string,
  config: Config
): Promise<void> => {
  const attestationToken = headers['x-attestation-token'] ?? headers['X-Attestation-Token'];
  const isTokenEndpoint = path.includes('/token');

  // attestation checks is only made on token endpoint (this includes refresh tokens)
  if (!isTokenEndpoint) return

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!attestationToken) { // empty string or undefined treated as missing
    throw new MissingAttestationTokenError('No attestation token header provided.')
  }

  await validateFirebaseJWT({
    token: attestationToken,
    firebaseAppIds: [
      config.firebaseAndroidAppId,
      config.firebaseIosAppId,
    ],
  })
}