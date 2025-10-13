/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { MiddlewareObj } from '@middy/core';
import { logger } from '../logger';
import { StatusCodes } from 'http-status-codes';
import { logMessages } from '../log-messages';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Log non-2xx responses from Cognito with safe fields only
export const logCognitoResponseMiddleware: MiddlewareObj = {
  after: (request): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const raw = request.response as APIGatewayProxyStructuredResultV2;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!raw) return;

    const status = typeof raw.statusCode === 'number' ? raw.statusCode : 0;
    if (
      (status >= StatusCodes.OK.valueOf() &&
        status < StatusCodes.MULTIPLE_CHOICES.valueOf()) ||
      status === 0
    )
      return;

    logger.warn(logMessages.COGNITO_ERROR, {
      statusCode: status,
      headers: raw.headers,
      body: raw.body,
    });
  },
};
