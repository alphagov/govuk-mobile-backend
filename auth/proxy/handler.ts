import type { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FailedToFetchSecretError, MissingAttestationTokenError, UnknownAppError } from './errors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { Dependencies } from './app';
import { sanitizeHeaders } from './sanitize-headers';

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

    if (featureFlags.ATTESTATION) {
      await attestationUseCase.validateAttestationHeaderOrThrow(headers, config)
    }

    return await proxy({
      method: httpMethod,
      path: '/oauth2/token',
      body,
      sanitizedHeaders: sanitizeHeaders(headers),
      parsedUrl: config.cognitoUrl,
      clientSecret: await getClientSecret(),
    })
  } catch (error) {
    console.error('Catchall error:', error);
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof MissingAttestationTokenError:
        return generateErrorResponse({
          statusCode: 400,
          message: 'Attestation token is missing'
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
