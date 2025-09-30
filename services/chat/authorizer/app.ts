import { authorizerResult } from './client/authorizer-client';
import { logMessages } from './log-messages';
import type { APIGatewayAuthorizerResult, Context } from 'aws-lambda';
import { logger } from './logger';
import type { MiddyfiedHandler } from '@middy/core';
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import z from 'zod';
import { errorMiddleware } from './middleware/global-error-handler';
import secretsManager, { secret } from '@middy/secrets-manager';
import type { SecretsConfig } from './types';
import { tracer } from './tracer';

const authorizerEventSchema = z.object({
  headers: z.object({
    Authorization: z.string(),
  }),
});

type AuthorizerEvent = z.infer<typeof authorizerEventSchema>;

const createHandler = (
  dependencies: Dependencies,
): MiddyfiedHandler<
  AuthorizerEvent,
  APIGatewayAuthorizerResult,
  Error,
  Context & { secrets: SecretsConfig }
> =>
  middy<AuthorizerEvent, APIGatewayAuthorizerResult>()
    .use(captureLambdaHandler(tracer))
    .use(
      injectLambdaContext(logger, {
        correlationIdPath: 'requestContext.requestId',
      }),
    )
    .use(parser({ schema: authorizerEventSchema }))
    .use(
      secretsManager({
        fetchData: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          secrets: secret<SecretsConfig>(process.env['CHAT_SECRET_NAME']!),
        },
        setToContext: true,
        // defaults cache to forever
      }),
    )
    .use(errorMiddleware())
    .handler(
      async (
        event: AuthorizerEvent,
        context: Context & { secrets: SecretsConfig },
      ): Promise<APIGatewayAuthorizerResult> => {
        logger.info(logMessages.AUTH_START);
        const result = await dependencies.authorizerResult(
          event.headers.Authorization,
          context.secrets,
        );

        logger.info(logMessages.AUTH_END);

        return result;
      },
    );

interface Dependencies {
  authorizerResult: typeof authorizerResult;
}

const dependencies: Dependencies = {
  authorizerResult,
};

const lambdaHandler = createHandler(dependencies);

export {
  createHandler,
  lambdaHandler,
  type AuthorizerEvent,
  type Dependencies,
};
