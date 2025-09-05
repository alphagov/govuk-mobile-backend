import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { SETTokenError } from '../errors';
import { generateResponse, generateErrorResponse } from '../response';

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
      request.response = generateResponse(
        StatusCodes.BAD_REQUEST,
        ReasonPhrases.BAD_REQUEST,
      );
    } else if (error instanceof SETTokenError) {
      request.response = generateErrorResponse({
        status: error.statusCode,
        errorCode: error.code,
        errorDescription: error.publicMessage,
      });
    } else {
      request.response = generateResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        ReasonPhrases.INTERNAL_SERVER_ERROR,
      );
    }
  },
});
