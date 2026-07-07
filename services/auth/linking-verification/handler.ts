import middy from '@middy/core';
import httpUrlEncodeBodyParser from '@middy/http-urlencode-body-parser';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { decodeJwt } from 'jose';
import { generateErrorResponseV2 } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';
import { createHmac } from 'node:crypto';
import z from 'zod';
import { tracer } from './tracer';
import { logger } from './logger';

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
  .use(httpUrlEncodeBodyParser())
  .use(parser({ schema: requestSchema }))
  .handler(
    async (event: APIGatewayProxyEvent & z.infer<typeof requestSchema>) => {
      const hashKeyParamName = process.env['HASH_KEY_SECRET_NAME'];
      if (typeof hashKeyParamName !== 'string' || !hashKeyParamName) {
        return {
          StatusCode: 500,
          body: JSON.stringify(
            generateErrorResponseV2({
              status: StatusCodes.INTERNAL_SERVER_ERROR,
              message: 'Invalid environment variables',
            }),
          ),
        };
      }

      const { token } = event.body;

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
        return {
          StatusCode: 500,
          body: JSON.stringify(
            generateErrorResponseV2({
              status: StatusCodes.INTERNAL_SERVER_ERROR,
              message: 'Invalid key',
            }),
          ),
        };
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
    },
  );
