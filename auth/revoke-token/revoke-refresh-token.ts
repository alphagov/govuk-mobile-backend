import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  TooManyRequestsException,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import type { APIGatewayProxyResult } from 'aws-lambda';
import type { RevokeTokenInput } from './types';

export const revokeRefreshToken = async (
  input: RevokeTokenInput,
  cognitoIdentityServiceProvider: CognitoIdentityProviderClient,
): Promise<APIGatewayProxyResult> => {
  const command = new RevokeTokenCommand(input);

  try {
    await cognitoIdentityServiceProvider.send(command);

    console.log('Refresh token revoked successfully.');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Refresh token revoked successfully.' }),
    };
  } catch (error) {
    console.error('Error revoking token:', error);

    let errorMessage = 'Failed to revoke token.';

    if (error instanceof InvalidParameterException) {
      errorMessage =
        'Invalid parameters provided to Cognito (e.g., token format or client ID).';
    } else if (error instanceof NotAuthorizedException) {
      errorMessage =
        'Not authorized to revoke this token (e.g., wrong client secret, token already revoked, or client ID mismatch).';
    } else if (error instanceof TooManyRequestsException) {
      errorMessage = 'Too many requests to Cognito. Please try again later.';
    } else if (error instanceof InternalErrorException) {
      errorMessage = 'An internal error occurred in Cognito. Please try again.';
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: errorMessage,
        errorDetails: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
