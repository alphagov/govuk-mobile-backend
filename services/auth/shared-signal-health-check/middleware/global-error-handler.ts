import type { MiddlewareObj, Request } from '@middy/core';
import { logger } from '../logger';

export const errorMiddleware = (): MiddlewareObj => ({
  onError: (request: Request): void => {
    const { error } = request;

    if (!error) {
      return;
    }

    logger.error(error.name, { error });
  },
});
