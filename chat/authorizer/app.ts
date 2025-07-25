import type {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';

import { AuthorizerClient } from './client/authorizer-client';

export const lambdaHandler = async (
  event: APIGatewayRequestAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  const authClient = new AuthorizerClient(event);
  return await authClient.authorizerResult();
};
