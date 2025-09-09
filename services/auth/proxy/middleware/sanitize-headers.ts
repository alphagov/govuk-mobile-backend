import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayEvent } from 'aws-lambda';
import type { SanitizedRequestHeaders } from '../sanitize-headers';
import { sanitizeHeaders } from '../sanitize-headers';
import type { FeatureFlagsContext } from './feature-flags';

export type SanitizeHeadersContext = FeatureFlagsContext & {
  isAttestationEnabled: boolean;
  sanitizedHeaders: SanitizedRequestHeaders;
};

export const sanitizeHeadersMiddleware: MiddlewareObj<
  APIGatewayEvent,
  unknown,
  Error,
  SanitizeHeadersContext
> = {
  before: async (request): Promise<void> => {
    const { headers } = request.event;

    // Sanitize headers and store in context for other middlewares
    const sanitizedHeaders = await sanitizeHeaders(
      headers,
      request.context.isAttestationEnabled,
    );
    request.context.sanitizedHeaders = sanitizedHeaders;
  },
};
