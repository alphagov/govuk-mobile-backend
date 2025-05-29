
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { MissingAttestationTokenError } from './errors';
import { validateFirebaseJWT } from './firebaseJwt';
import type { AppConfig } from './config';

export interface AttestationUseCase {
  validateAttestationHeaderOrThrow: (headers: APIGatewayProxyEventHeaders, config: AppConfig) => Promise<void>
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
  config: AppConfig
): Promise<void> => {
  const attestationToken = headers['x-attestation-token'] ?? headers['X-Attestation-Token'];

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!attestationToken) { // empty string or undefined treated as missing
    throw new MissingAttestationTokenError('No attestation token header provided.')
  }

  await validateFirebaseJWT({
    token: attestationToken,
    configValues: config,  
  })
}