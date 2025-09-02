import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import querystring from 'querystring';
import type { CognitoCredentials, RevokeTokenInput } from './types';
import { revokeRefreshToken } from './revoke-refresh-token';
import { retrieveCognitoCredentials } from './cognito';
import { logger } from './logger';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns object - API Gateway Lambda Proxy Output Format
 */
const cognitoIdentityServiceProvider: CognitoIdentityProviderClient =
  new CognitoIdentityProviderClient({
    region: 'eu-west-2',
  });

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);
  logger.setCorrelationId(event.requestContext.requestId);

  if (event.body == null || event.body === '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Missing request body',
      }),
    };
  }
  const body = querystring.parse(event.body);
  let refreshToken = body['refresh_token'];
  let clientId = body['client_id'];

  if (Array.isArray(clientId)) {
    [clientId] = clientId;
  }

  if (Array.isArray(refreshToken)) {
    [refreshToken] = refreshToken;
  }

  if (refreshToken === undefined || refreshToken == '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Missing refresh token',
      }),
    };
  }

  if (clientId === undefined || clientId == '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Missing client ID',
      }),
    };
  }

  const clientCredentials: CognitoCredentials =
    await retrieveCognitoCredentials(
      {
        clientId: clientId,
      },
      cognitoIdentityServiceProvider,
    );

  const revokeInput: RevokeTokenInput = {
    Token: refreshToken,
    ClientId: clientCredentials.clientId,
    ClientSecret: clientCredentials.clientSecret,
  };

  return await revokeRefreshToken(revokeInput, cognitoIdentityServiceProvider);
};
