import type { MiddlewareObj, Request } from '@middy/core';
import { ParseError } from '@aws-lambda-powertools/parser';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { AppError } from '../errors';
import { ZodError } from 'zod';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { TokenExpiredError } from 'jsonwebtoken';
import { JWTClaimValidationFailed } from 'jose/errors';

const generateErrorResponse = ({
  status,
  message,
}: {
  status: number;
  message: string;
}): APIGatewayProxyResultV2 => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/x-amz-json-1.1' },
  body: JSON.stringify({ message }),
});

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
      request.response = generateErrorResponse({
        status: StatusCodes.BAD_REQUEST,
        message: ReasonPhrases.BAD_REQUEST,
      });
    } else if (error instanceof TokenExpiredError) {
      request.response = generateErrorResponse({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Attestation token has expired',
      });
    } else if (error instanceof JWTClaimValidationFailed) {
      request.response = generateErrorResponse({
        status: StatusCodes.UNAUTHORIZED,
        message: error.reason,
      });
    } else if (error instanceof AppError) {
      request.response = generateErrorResponse({
        status: error.statusCode,
        message: error.publicMessage,
      });
    } else {
      request.response = generateErrorResponse({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  },
});
