import type { MiddlewareObj, Request } from '@middy/core';
import { logger } from '../logger';
import { ParseError } from '@aws-lambda-powertools/parser';
import { getAuthorizerResult } from '../client/getAuthorizerResult';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error(error.name, { error });

    if (error instanceof ParseError) {
      request.response = getAuthorizerResult('unknown', 'Deny', '');
    }
  },
});
