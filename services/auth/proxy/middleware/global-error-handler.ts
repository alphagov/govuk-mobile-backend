import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { AppError } from '../errors';
import { ZodError } from 'zod';
import { TokenExpiredError } from 'jsonwebtoken';
import { generateErrorResponseV2 } from '@libs/http-utils';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error(error.name, { error });

    if (
      error instanceof ParseError ||
      error instanceof ZodError ||
      error.name === 'UnsupportedMediaTypeError'
    ) {
      request.response = generateErrorResponseV2({
        status: StatusCodes.BAD_REQUEST,
        message: ReasonPhrases.BAD_REQUEST,
      });
    } else if (error instanceof TokenExpiredError) {
      request.response = generateErrorResponseV2({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Attestation token has expired',
      });
    } else if (error instanceof AppError) {
      request.response = generateErrorResponseV2({
        status: error.statusCode,
        message: error.publicMessage,
      });
    } else {
      request.response = generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  },
});
