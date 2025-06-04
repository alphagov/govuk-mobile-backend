import { validateFirebaseJWT } from './firebaseJwt';
import type { AppConfig } from './config';
import type { SanitizedRequestHeaders } from './sanitize-headers';

export interface AttestationUseCase {
  validateAttestationHeaderOrThrow: (headers: SanitizedRequestHeaders, config: AppConfig) => Promise<void>
}

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * @param headers 
 * @param path
 * @param config
 * @returns
 * @throws {import('jsonwebtoken').JsonWebTokenError} 
 */
export const validateAttestationHeaderOrThrow = async (
  headers: SanitizedRequestHeaders,
  config: AppConfig
): Promise<void> => {
  const attestationToken = headers['x-attestation-token'];

  await validateFirebaseJWT({
    token: attestationToken,
    configValues: config,  
  })
}