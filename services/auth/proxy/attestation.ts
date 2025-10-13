import { validateFirebaseJWT } from './firebaseJwt';
import type { AppConfig } from './config';
import type { SanitizedRequestHeadersWithAttestation } from './sanitize-headers';

export interface AttestationUseCase {
  validateAttestationHeaderOrThrow: (
    headers: SanitizedRequestHeadersWithAttestation,
    config: AppConfig,
  ) => Promise<void>;
}

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * @param headers - Attestation headers
 * @param config - Firebase app config
 * @returns - Returns void or throws exception
 */
export const validateAttestationHeaderOrThrow = async (
  headers: SanitizedRequestHeadersWithAttestation,
  config: AppConfig,
): Promise<void> => {
  const attestationToken = headers['x-attestation-token'];

  await validateFirebaseJWT({
    token: attestationToken,
    configValues: config,
  });
};
