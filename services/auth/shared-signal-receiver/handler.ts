import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logMessages } from './log-messages';
import type { Dependencies } from './app';
import { logger } from './logger';
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { errorMiddleware } from './middleware/global-error-handler';
import { decodeSetMiddleware } from './middleware/decode-set';
import type { MiddyfiedHandler } from '@middy/core';
import type { DecodedSetContext } from './middleware/decode-set';
import { ApiGatewayEnvelope } from '@aws-lambda-powertools/parser/envelopes/api-gateway';
import z from 'zod';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { tracer } from './tracer';

const schema = z.string();

/**
 * Creates a handler for the shared signal receiver lambda function
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param dependencies - The dependencies required for the handler
 * @returns A middy-wrapped handler function that processes API Gateway events
 */
export const createHandler = (
  dependencies: Dependencies,
): MiddyfiedHandler<
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Error,
  DecodedSetContext
> =>
  middy()
    .use(captureLambdaHandler(tracer))
    .use(
      injectLambdaContext(logger, {
        correlationIdPath: 'requestContext.requestId',
      }),
    )
    .use(parser({ schema, envelope: ApiGatewayEnvelope }))
    .use(decodeSetMiddleware(dependencies))
    .use(errorMiddleware())
    .handler(
      async (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _: APIGatewayProxyEvent,
        context: DecodedSetContext,
      ): Promise<APIGatewayProxyResult> => {
        logger.info(logMessages.SIGNAL_RECEIVER_CALLED);

        return await dependencies.requestHandler(context.decodedJwt);
      },
    );
