import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { AppError } from '../errors';
import { generateResponse } from '@libs/http-utils';

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
      request.response = generateResponse({
        status: StatusCodes.BAD_REQUEST,
        message: ReasonPhrases.BAD_REQUEST,
      });
    } else if (error instanceof AppError) {
      request.response = generateResponse({
        status: error.statusCode,
        message: error.publicMessage,
      });
    } else {
      request.response = generateResponse({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  },
});
