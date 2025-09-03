import { AuthorizerClient } from './client/authorizer-client';
import { logMessages } from './log-messages';
import type {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
} from 'aws-lambda';
import { logger } from './logger';

export const lambdaHandler = async (
  event: APIGatewayRequestAuthorizerEvent,
  context: Context,
): Promise<APIGatewayAuthorizerResult> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);

  logger.info(logMessages.AUTH_START, {
    requestId: event.requestContext.requestId,
  });

  const authClient = new AuthorizerClient(event);
  const result = await authClient.authorizerResult();

  logger.info(logMessages.AUTH_END, {
    requestId: event.requestContext.requestId,
  });

  return result;
};
