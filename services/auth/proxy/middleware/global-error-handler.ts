import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { AppError } from '../errors';
import { ZodError } from 'zod';
import { TokenExpiredError } from 'jsonwebtoken';
import { createResponseV2 } from '@libs/http-utils';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error(error.name, { error });

    const awsHeaders = { 'Content-Type': 'application/x-amz-json-1.1' };

    if (
      error instanceof ParseError ||
      error instanceof ZodError ||
      error.name === 'UnsupportedMediaTypeError'
    ) {
      request.response = createResponseV2(
        StatusCodes.BAD_REQUEST,
        {
          message: ReasonPhrases.BAD_REQUEST,
        },
        awsHeaders,
      );
    } else if (error instanceof TokenExpiredError) {
      request.response = createResponseV2(
        StatusCodes.UNAUTHORIZED,
        {
          message: 'Attestation token has expired',
        },
        awsHeaders,
      );
    } else if (error instanceof AppError) {
      request.response = createResponseV2(
        error.statusCode,
        {
          message: error.publicMessage,
        },
        awsHeaders,
      );
    } else {
      request.response = createResponseV2(
        StatusCodes.INTERNAL_SERVER_ERROR,
        {
          message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        },
        awsHeaders,
      );
    }
  },
});
