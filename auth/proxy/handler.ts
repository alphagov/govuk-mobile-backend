import type { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FailedToFetchSecretError, UnknownAppError } from './errors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { Dependencies } from './app';
import { sanitizeHeaders } from './sanitize-headers';
import { ZodError } from 'zod';

const generateErrorResponse = ({
  statusCode,
  message
}: {
  statusCode: number,
  message: string
}): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/x-amz-json-1.1' },
  body: JSON.stringify({ message })
})

export const createHandler = (dependencies: Dependencies) => async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log('Calling auth proxy')

    const { proxy, attestationUseCase, featureFlags, getClientSecret, getConfig } = dependencies;
    const config = getConfig()

    const { headers, body, httpMethod, path } = event;

    // only accept requests to the token endpoint
    if (!path.includes('/oauth2/token') || httpMethod !== 'POST') {
      return generateErrorResponse({
        statusCode: 404,
        message: 'Not Found'
      });
    }

    if (body == null || body === '') {
      return generateErrorResponse({
        statusCode: 400,
        message: 'Invalid Request'
      });
    }

    const sanitizedHeaders = await sanitizeHeaders(headers)

    if (featureFlags.ATTESTATION) {
      await attestationUseCase.validateAttestationHeaderOrThrow(sanitizedHeaders, config)
    }

    return await proxy({
      method: httpMethod,
      path: '/oauth2/token',
      body,
      sanitizedHeaders,
      parsedUrl: config.cognitoUrl,
      clientSecret: await getClientSecret(),
    })
  } catch (error) {
    console.error('Catchall error:', error);
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof ZodError:
        return generateErrorResponse({
          statusCode: 400,
          message: 'Invalid Request'
        });
      case error instanceof TokenExpiredError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Attestation token has expired'
        });
      case error instanceof JsonWebTokenError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Attestation token is invalid'
        });
      case error instanceof UnknownAppError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Unknown app associated with attestation token'
        });
      case error instanceof FailedToFetchSecretError:
        return generateErrorResponse({
          statusCode: 500,
          message: 'Internal server error, server missing key dependencies'
        });
      default:
        return generateErrorResponse({
          statusCode: 500,
          message: 'Internal server error'
        });
    }
  }
}
