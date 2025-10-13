import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { AppError } from '../errors';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error('Error in revoke-token', error);

    if (
      error instanceof ParseError ||
      error.name === 'UnsupportedMediaTypeError'
    ) {
      request.response = {
        statusCode: StatusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: ReasonPhrases.BAD_REQUEST }),
      };
    } else if (error instanceof AppError) {
      request.response = {
        statusCode: error.statusCode,
        body: JSON.stringify({ message: error.publicMessage }),
      };
    } else {
      request.response = {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: JSON.stringify({ message: ReasonPhrases.INTERNAL_SERVER_ERROR }),
      };
    }
  },
});
