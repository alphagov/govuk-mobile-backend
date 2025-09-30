import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoCredentials, RevokeTokenInput } from './types';
import { revokeRefreshToken } from './revoke-refresh-token';
import { retrieveCognitoCredentials } from './cognito';
import { logger } from './logger';
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { z } from 'zod';
import { errorMiddleware } from './middleware/global-error-handler';
import httpUrlEncodeBodyParser from '@middy/http-urlencode-body-parser';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { tracer } from './tracer';

const cognitoIdentityServiceProvider: CognitoIdentityProviderClient =
  new CognitoIdentityProviderClient({
    region: 'eu-west-2',
  });

const schema = z.object({
  body: z.object({
    refresh_token: z.string(),
    client_id: z.string(),
  }),
});

export const lambdaHandler = middy()
  .use(captureLambdaHandler(tracer))
  .use(
    injectLambdaContext(logger, {
      correlationIdPath: 'requestContext.requestId',
    }),
  )
  // #1 parses urlencoded body
  .use(httpUrlEncodeBodyParser())
  .use(parser({ schema }))
  .use(errorMiddleware())
  .handler(async (event: APIGatewayProxyEvent & z.infer<typeof schema>) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { refresh_token, client_id } = event.body;

    const clientCredentials: CognitoCredentials =
      await retrieveCognitoCredentials(
        {
          clientId: client_id,
        },
        cognitoIdentityServiceProvider,
      );

    const revokeInput: RevokeTokenInput = {
      Token: refresh_token,
      ClientId: clientCredentials.clientId,
      ClientSecret: clientCredentials.clientSecret,
    };

    return await revokeRefreshToken(
      revokeInput,
      cognitoIdentityServiceProvider,
    );
  });
