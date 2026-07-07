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

const requestSchema = z.object({
  body: z.object({
    token: z.string(),
  }),
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
    const validationResult = z.safeParse(requestSchema, event.body);
    if (!validationResult.success) {
      return generateErrorResponseV2({
        status: StatusCodes.BAD_REQUEST,
        message: 'Invalid request body',
      });
    }
    const { token } = validationResult.data.body;

    const hashKeyParamName = process.env['HASH_KEY_SECRET_NAME'];
    if (typeof hashKeyParamName !== 'string' || !hashKeyParamName) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid environment variables',
      });
    }

    //Decoding JWT -> Getting email
    const claims = decodeJwt(token);
    const { email } = claims;
    if (typeof email !== 'string' || !email) {
      return {
        StatusCode: 500,
        body: JSON.stringify(
          generateErrorResponseV2({
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            message: 'No valid email in token',
          }),
        ),
      };
    }

    //Hashing Email
    const hashKey = await getSecret(hashKeyParamName, {
      maxAge: sixtyMinutes,
    });
    if (typeof hashKey !== 'string') {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid key',
      });
    }

    const verificationHash = createHmac('sha256', hashKey)
      .update(email)
      .digest('hex');

    return {
      StatusCodes: 200,
      body: JSON.stringify({
        verificationHash,
      }),
    };
  });
