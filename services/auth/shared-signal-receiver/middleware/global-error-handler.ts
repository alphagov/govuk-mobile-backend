import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { logger } from '../logger';
import { SETTokenError } from '../errors';
import { createResponse } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error(error.name, { error });

    if (
      error instanceof ParseError ||
      error.name === 'UnsupportedMediaTypeError' ||
      error.name === 'ZodError'
    ) {
      request.response = createResponse(StatusCodes.BAD_REQUEST);
    } else if (error instanceof SETTokenError) {
      // Use the smart response with custom data structure for SET errors
      request.response = createResponse(error.statusCode, {
        data: {
          err: error.code,
          description: error.publicMessage,
        },
      });
    } else {
      request.response = createResponse(StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },
});
