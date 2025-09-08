import type { APIGatewayAuthorizerResult, StatementEffect } from 'aws-lambda';

/**
 * Constructs the authorizer result based on the Cognito token payload and effect.
 * @param cognitoTokenPayload The Cognito token payload.
 * @param userId
 * @param effect The effect of the authorization (Allow or Deny).
 * @param bearerToken The bearer token to include in the context.
 * @returns The authorizer result.
 */
export const getAuthorizerResult = (
  userId: string,
  effect: StatementEffect,
  bearerToken: string,
): APIGatewayAuthorizerResult => {
  return {
    principalId: userId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: '*',
        },
      ],
    },
    context: {
      bearerToken: `Bearer ${bearerToken}`,
      'Govuk-Chat-End-User-Id': userId,
    },
  };
};
