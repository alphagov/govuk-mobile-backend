import type { APIGatewayAuthorizerResult, StatementEffect } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';
import type { SecretsConfig } from '../types';
import { logger } from '../logger';
import { getAuthorizerResult } from './getAuthorizerResult';

/**
 * Retrieves the Cognito token payload from the JWT.
 * @param authHeader The authorization header containing the JWT.
 * @param userPoolId The Cognito User Pool ID.
 * @param clientId The Cognito Client ID.
 * @returns The Cognito token payload.
 */
const getCognitoTokenPayloadFromJwt = async (
  authHeader: string,
  userPoolId: string,
  clientId: string,
): Promise<CognitoAccessTokenPayload | undefined> => {
  const verifier = CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: 'access',
    clientId: clientId,
  });

  try {
    const payload: CognitoAccessTokenPayload = await verifier.verify(
      authHeader,
    );
    return payload;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    logger.error('Token not valid', err as Error);
    return undefined;
  }
};

/**
 * Authorizes the request by verifying the JWT token and returning an authorizer result.
 * @param authHeader The authorization header containing the JWT token.
 * @param secrets The secrets configuration object.
 * @returns The authorizer result.
 */
export const authorizerResult = async (
  authHeader: string,
  secrets: SecretsConfig,
): Promise<APIGatewayAuthorizerResult> => {
  const { clientId, userPoolId, bearerToken } = secrets;

  const [, token] = authHeader.split(' ');

  if (token === undefined || token.trim() === '') {
    logger.error(
      "Authorization header 'Authorization' does not contain a token",
    );
    return getAuthorizerResult('unknown', 'Deny', bearerToken);
  }

  const cognitoTokenPayload = await getCognitoTokenPayloadFromJwt(
    token,
    userPoolId,
    clientId,
  );

  const effect: StatementEffect = cognitoTokenPayload ? 'Allow' : 'Deny';
  const userId = cognitoTokenPayload?.sub ?? 'unknown';

  return getAuthorizerResult(userId, effect, bearerToken);
};
