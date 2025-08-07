import { AuthorizerClient } from './client/authorizer-client';
import { logMessages } from './log-messages';
import type {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';

export const lambdaHandler = async (
  event: APIGatewayRequestAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  console.info(logMessages.AUTH_START, {
    requestId: event.requestContext.requestId,
  });

  const authClient = new AuthorizerClient(event);
  const result = await authClient.authorizerResult();

  console.info(logMessages.AUTH_END, {
    requestId: event.requestContext.requestId,
  });

  return result;
};
