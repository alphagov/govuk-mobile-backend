
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { MissingAttestationTokenError } from './errors';
import { FEATURE_FLAGS } from './feature-flags';

export interface AttestationUseCase {
  validateAttestationHeaderOrThrow: (headers: APIGatewayProxyEventHeaders, path: string, config: any) => void
}

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * 
 * @param {APIGatewayProxyEventHeaders} headers 
 * @returns 
 * @throws {MissingAttestationTokenError} 
 */
export const validateAttestationHeaderOrThrow = (headers: APIGatewayProxyEventHeaders, path: string): void => {
  if (!FEATURE_FLAGS.ATTESTATION) return

  const attestationToken = headers['x-attestation'] || headers['X-Attestation'];
  const isAuthorizeEndpoint = path.includes('/authorize');

  if (isAuthorizeEndpoint && !attestationToken) {
    throw new MissingAttestationTokenError('No attestation token header provided.')
  }
}