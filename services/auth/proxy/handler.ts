import type { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { Dependencies } from './app';
import type { RequestBody } from './validation/body';
import { grantUnionSchema } from './validation/body';
import { logMessages } from './log-messages';
import { logger } from './logger';
import type { MiddyfiedHandler } from '@middy/core';
import middy from '@middy/core';
import { errorMiddleware } from './middleware/global-error-handler';
import { attestationMiddleware } from './middleware/attestation';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { ApiGatewayEnvelope } from '@aws-lambda-powertools/parser/envelopes/api-gateway';
import { sanitizeHeadersMiddleware } from './middleware/sanitize-headers';
import { featureFlagsMiddleware } from './middleware/feature-flags';
import httpUrlEncodeBodyParser from '@middy/http-urlencode-body-parser';
import type { SanitizedRequestHeaders } from './sanitize-headers';
import type { SanitizeHeadersContext } from './middleware/sanitize-headers';
import { logCognitoResponseMiddleware } from './middleware/log-cognito-response';

type AppContext = SanitizeHeadersContext & {
  sanitizedHeaders: SanitizedRequestHeaders;
  isAttestationEnabled: boolean;
};

export const createHandler = (
  dependencies: Dependencies,
): MiddyfiedHandler<
  APIGatewayEvent,
  APIGatewayProxyResultV2,
  Error,
  AppContext
> =>
  middy<APIGatewayEvent, APIGatewayProxyResultV2, Error, AppContext>()
    .use(
      injectLambdaContext(logger, {
        correlationIdPath: 'requestContext.requestId',
      }),
    )
    .use(httpUrlEncodeBodyParser())
    .use(featureFlagsMiddleware(dependencies))
    .use(sanitizeHeadersMiddleware)
    .use(attestationMiddleware(dependencies))
    .use(parser({ schema: grantUnionSchema, envelope: ApiGatewayEnvelope }))
    .use(logCognitoResponseMiddleware)
    .use(errorMiddleware())
    .handler(async (event: RequestBody, context: AppContext) => {
      logger.info(logMessages.ATTESTATION_STARTED);

      const { proxy, getClientSecret, getConfig } = dependencies;
      const config = await getConfig();

      const response = await proxy({
        method: 'POST',
        path: '/oauth2/token',
        body: event,
        sanitizedHeaders: context.sanitizedHeaders,
        parsedUrl: config.cognitoUrl,
        clientSecret: await getClientSecret(config.cognitoSecretName),
        config,
      });

      logger.info(logMessages.ATTESTATION_COMPLETED);

      return response;
    });
