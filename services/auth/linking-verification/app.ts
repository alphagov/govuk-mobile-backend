import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { decodeJwt } from 'jose';
import { generateErrorResponseV2 } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';
import { createHmac } from 'node:crypto';
import z from 'zod';
import { tracer } from './tracer';
import { logger } from './logger';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityServiceProvider: CognitoIdentityProviderClient =
  new CognitoIdentityProviderClient({
    region: 'eu-west-2',
  });

const requestSchema = z.object({
  token: z.string(),
});

const sixtyMinutes = 60 * 60 * 1000; // maximum lifetime of a lambda container

export const lambdaHandler = middy()
  .use(captureLambdaHandler(tracer))
  .use(
    injectLambdaContext(logger, {
      correlationIdPath: 'requestContext.requestId',
    }),
  )
  .handler(async (event: APIGatewayProxyEvent) => {
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const eventBody = JSON.parse(event.body);
    const validationResult = z.safeParse(requestSchema, eventBody);
    if (!validationResult.success) {
      return generateErrorResponseV2({
        status: StatusCodes.BAD_REQUEST,
        message: 'Invalid request body',
      });
    }
    const { token } = validationResult.data;

    const hashKeyParamName = process.env['HASH_KEY_SECRET_NAME'];
    if (typeof hashKeyParamName !== 'string' || !hashKeyParamName) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid environment variables',
      });
    }

    const userPoolId = process.env['USER_POOL_ID'];
    if (typeof userPoolId !== 'string' || !userPoolId) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid environment variables',
      });
    }

    //Decoding JWT -> Getting email
    const claims = decodeJwt(token);
    const { sub } = claims;
    if (typeof sub !== 'string' || !sub) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'No valid sub in token',
      });
    }

    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: sub,
    });
    let email = '';
    try {
      const cognitoUser = await cognitoIdentityServiceProvider.send(command);
      if (!cognitoUser.UserAttributes) {
        return generateErrorResponseV2({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'No valid cognito user',
        });
      }
      const emailAttribute = cognitoUser.UserAttributes.find(
        (attribute) => attribute.Name === 'email',
      );
      email = emailAttribute?.Value ?? 'no-email';
      if (email === 'no-email') {
        return generateErrorResponseV2({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'No valid cognito email',
        });
      }
    } catch (error) {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      logger.error((error as Error).message);
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Cognito Failure',
      });
    }

    //Hashing Email
    let hashKey = undefined;
    try {
      hashKey = await getSecret(hashKeyParamName, {
        maxAge: sixtyMinutes,
      });
    } catch (error) {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      logger.error((error as Error).message);
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch hash key',
      });
    }

    if (typeof hashKey !== 'string') {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid hash key',
      });
    }

    const verificationHash = createHmac('sha256', hashKey)
      .update(email)
      .digest('hex');

    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify({
        verificationHash,
      }),
    };
  });
