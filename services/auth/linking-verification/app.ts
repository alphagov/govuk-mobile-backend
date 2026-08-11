import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { CompactEncrypt, decodeJwt } from 'jose';
import { generateErrorResponseV2 } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';
import { createHmac, createPublicKey } from 'node:crypto';
import z from 'zod';
import { tracer } from './tracer';
import { logger } from './logger';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';

const cognitoIdentityServiceProvider: CognitoIdentityProviderClient =
  new CognitoIdentityProviderClient({
    region: 'eu-west-2',
  });

const requestSchema = z.object({
  token: z.string(),
});

// Helper to base64url encode JSON objects or buffers
function base64UrlEncode(input: object | Buffer): string {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(JSON.stringify(input));
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const sixtyMinutes = 60 * 60 * 1000; // maximum lifetime of a lambda container

const kmsClient = new KMSClient({ region: 'eu-west-2' });

export const lambdaHandler = middy()
  .use(captureLambdaHandler(tracer))
  .use(
    injectLambdaContext(logger, {
      correlationIdPath: 'requestContext.requestId',
    }),
  )
  .handler(async (event: APIGatewayProxyEvent) => {
    //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const eventBody = JSON.parse(event.body ?? '{}');
    const validationResult = z.safeParse(requestSchema, eventBody);
    if (!validationResult.success) {
      return generateErrorResponseV2({
        status: StatusCodes.BAD_REQUEST,
        message: 'Invalid request body',
      });
    }
    const { token } = validationResult.data;

    const verificationHashKeyParamName =
      process.env['VERIFICATION_HASH_KEY_SECRET_NAME'];
    const sessionHashKeyParamName = process.env['SESSION_HASH_KEY_SECRET_NAME'];
    const dvlaJWEPubKeyParamName = process.env['DVLA_JWE_PUB_KEY_PARAM_NAME'];
    const dvlaJWSSigningKeyId = process.env['DVLA_JWS_SIGNING_KEY_ID'];
    const userPoolId = process.env['USER_POOL_ID'];
    if (
      typeof verificationHashKeyParamName !== 'string' ||
      !verificationHashKeyParamName ||
      typeof sessionHashKeyParamName !== 'string' ||
      !sessionHashKeyParamName ||
      typeof dvlaJWEPubKeyParamName !== 'string' ||
      !dvlaJWEPubKeyParamName ||
      typeof dvlaJWSSigningKeyId !== 'string' ||
      !dvlaJWSSigningKeyId ||
      typeof userPoolId !== 'string' ||
      !userPoolId
    ) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid environment variables',
      });
    }

    //Decoding JWT -> Getting email
    const claims = decodeJwt(token);
    const { username, sub } = claims;
    if (
      typeof username !== 'string' ||
      !username ||
      typeof sub !== 'string' ||
      !sub
    ) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid claims in token',
      });
    }

    const cognitoCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    });
    let email = '';
    try {
      const cognitoUser = await cognitoIdentityServiceProvider.send(
        cognitoCommand,
      );
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

    //Hashing Email & SUB, signing token, encrypting
    let verificationHashKey = undefined;
    let sessionHashKey = undefined;
    let dvlaJWEPubKeyPem = undefined;
    try {
      verificationHashKey = await getSecret(verificationHashKeyParamName, {
        maxAge: sixtyMinutes,
      });
      sessionHashKey = await getSecret(sessionHashKeyParamName, {
        maxAge: sixtyMinutes,
      });
      dvlaJWEPubKeyPem = await getSecret(dvlaJWEPubKeyParamName, {
        maxAge: sixtyMinutes,
      });
    } catch (error) {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      logger.error((error as Error).message);
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch key(s)',
      });
    }

    if (
      typeof verificationHashKey !== 'string' ||
      typeof sessionHashKey !== 'string' ||
      typeof dvlaJWEPubKeyPem !== 'string'
    ) {
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Invalid key(s)',
      });
    }

    const verification = createHmac('sha256', verificationHashKey)
      .update(email)
      .digest('hex');

    const session = createHmac('sha256', sessionHashKey)
      .update(sub)
      .digest('hex');

    const iat = Math.floor(Date.now() / 1000);
    const jwtHeader = {
      alg: 'PS256',
      typ: 'JWT',
    };
    const jwtPayload = {
      session,
      verification,
      iat,
      exp: iat + 600,
    };

    const encodedHeader = base64UrlEncode(jwtHeader);
    const encodedPayload = base64UrlEncode(jwtPayload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const kmsCommand = new SignCommand({
      KeyId: dvlaJWSSigningKeyId,
      Message: Buffer.from(signingInput),
      MessageType: 'RAW',
      SigningAlgorithm: 'RSASSA_PSS_SHA_256',
    });

    let jws = '';
    try {
      const response = await kmsClient.send(kmsCommand);
      if (!response.Signature) {
        logger.error('No signature returned');
        return generateErrorResponseV2({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'No signature returned',
        });
      }
      const signatureB64 = base64UrlEncode(Buffer.from(response.Signature));
      jws = `${signingInput}.${signatureB64}`;
    } catch (error) {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      logger.error((error as Error).message);
      return generateErrorResponseV2({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to sign token',
      });
    }

    const dvlaPublicKey = createPublicKey(dvlaJWEPubKeyPem);
    const encoder = new TextEncoder();
    const jwe = await new CompactEncrypt(encoder.encode(jws))
      .setProtectedHeader({
        alg: 'RSA-OAEP-256',
        enc: 'A256GCM',
        cty: 'JWT',
      })
      .encrypt(dvlaPublicKey);

    return {
      statusCode: StatusCodes.OK,
      body: JSON.stringify({
        token: jwe,
      }),
    };
  });
