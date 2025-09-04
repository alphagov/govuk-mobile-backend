import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayEvent } from 'aws-lambda';
import type { Dependencies } from '../app';
import type { SanitizedRequestHeadersWithAttestation } from '../sanitize-headers';
import type { SanitizeHeadersContext } from './sanitize-headers';

export const attestationMiddleware = (
  dependencies: Dependencies,
): MiddlewareObj<APIGatewayEvent, unknown, Error, SanitizeHeadersContext> => ({
  before: async (request): Promise<void> => {
    const { attestationUseCase, getConfig } = dependencies;

    const config = await getConfig();
    const { isAttestationEnabled } = request.context;

    if (isAttestationEnabled) {
      const { sanitizedHeaders } = request.context;
      await attestationUseCase.validateAttestationHeaderOrThrow(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        sanitizedHeaders as SanitizedRequestHeadersWithAttestation,
        config,
      );
    }
  },
});
