
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { MissingAttestationTokenError } from './errors';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAppCheck } from "firebase-admin/app-check";

initializeApp({
  credential: applicationDefault(),
});

/**
 * Validates:
 * - attestation check is only made on authorize endpoint - token exchange handled by cognito and third-party
 * - attestation token is present
 * 
 * @param {APIGatewayProxyEventHeaders} headers 
 * @returns 
 * @throws {MissingAttestationTokenError} 
 */
export const validateAttestationHeaderOrThrow = async (headers: APIGatewayProxyEventHeaders, path: string): Promise<void> => {

  const attestationToken = headers['attestation-token'] || headers['Attestation-Token'];
  const isTokenEndpoint = path.includes('/token');

  if(!isTokenEndpoint) return

  if (!attestationToken) {
    throw new MissingAttestationTokenError('No attestation token header provided.')
  } 

  await getAppCheck().verifyToken(attestationToken)
}