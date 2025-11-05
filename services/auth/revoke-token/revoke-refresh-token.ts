import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  InvalidParameterException,
  NotAuthorizedException,
  TooManyRequestsException,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import type { APIGatewayProxyResult } from 'aws-lambda';
import type { RevokeTokenInput } from './types';
import { logger } from './logger';
import {
  AppError,
  InvalidParameterError,
  NotAuthorizedError,
  TooManyRequestsError,
} from './errors';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { createResponse } from '@libs/http-utils';

export const revokeRefreshToken = async (
  input: RevokeTokenInput,
  cognitoIdentityServiceProvider: CognitoIdentityProviderClient,
): Promise<APIGatewayProxyResult> => {
  const command = new RevokeTokenCommand(input);

  try {
    await cognitoIdentityServiceProvider.send(command);

    logger.info('Refresh token revoked successfully.');
    return createResponse(StatusCodes.OK);
  } catch (error) {
    if (error instanceof InvalidParameterException) {
      throw new InvalidParameterError(
        'Invalid parameters provided to Cognito (e.g., token format or client ID).',
        error,
      );
    } else if (error instanceof NotAuthorizedException) {
      throw new NotAuthorizedError(
        'Not authorized to revoke this token (e.g., wrong client secret, token already revoked, or client ID mismatch).',
      );
    } else if (error instanceof TooManyRequestsException) {
      throw new TooManyRequestsError(
        'Too many requests to Cognito. Please try again later.',
      );
    } else {
      throw new AppError(ReasonPhrases.INTERNAL_SERVER_ERROR, {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        code: ReasonPhrases.INTERNAL_SERVER_ERROR,
        publicMessage: ReasonPhrases.INTERNAL_SERVER_ERROR,
        cause: error,
      });
    }
  }
};
