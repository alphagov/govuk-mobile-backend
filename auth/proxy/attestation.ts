
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { MissingAttestationTokenError } from './errors';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAppCheck } from "firebase-admin/app-check";
import { getFirebaseCredentials } from './getFirebaseCredentials';

let cachedApp: App | null = null;

async function initializeFirebase() {
  const serviceAccount = await getFirebaseCredentials();

  if(!serviceAccount) {
    throw new Error('No firebase service account loaded')
  }

  if (!cachedApp) {
    cachedApp = initializeApp({
      credential: cert(serviceAccount),
    });
  }
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
export const validateAttestationHeaderOrThrow = async (headers: APIGatewayProxyEventHeaders, path: string): Promise<void> => {
  await initializeFirebase()

  const attestationToken = headers['attestation-token'] || headers['Attestation-Token'];
  const isTokenEndpoint = path.includes('/token');

  if(!isTokenEndpoint) return

  if (!attestationToken) {
    throw new MissingAttestationTokenError('No attestation token header provided.')
  } 

  await getAppCheck().verifyToken(attestationToken)
}

