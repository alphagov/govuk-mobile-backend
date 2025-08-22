import type { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FailedToFetchSecretError, UnknownAppError } from './errors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { Dependencies } from './app';
import type { SanitizedRequestHeadersWithAttestation } from './sanitize-headers';
import { sanitizeHeaders } from './sanitize-headers';
import { ZodError } from 'zod/v4';
import { validateRequestBodyOrThrow } from './validation/body';
import { logMessages } from './log-messages';

const generateErrorResponse = ({
  statusCode,
  message,
}: {
  statusCode: number;
  message: string;
}): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/x-amz-json-1.1' },
  body: JSON.stringify({ message }),
});

export const createHandler =
  (dependencies: Dependencies) =>
  async (event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      console.log(logMessages.ATTESTATION_STARTED);

      const {
        proxy,
        attestationUseCase,
        featureFlags,
        getClientSecret,
        getConfig,
      } = dependencies;
      const config = await getConfig();

      const { headers, body, httpMethod, path } = event;

      // only accept requests to the token endpoint
      if (!path.includes('/oauth2/token') || httpMethod !== 'POST') {
        return generateErrorResponse({
          statusCode: 404,
          message: 'Not Found',
        });
      }

      const validatedBody = await validateRequestBodyOrThrow(body);

      const sanitizedHeaders = await sanitizeHeaders(
        headers,
        featureFlags.ATTESTATION,
      );

      if (featureFlags.ATTESTATION) {
        await attestationUseCase.validateAttestationHeaderOrThrow(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          sanitizedHeaders as SanitizedRequestHeadersWithAttestation,
          config,
        );
      }

      const response = await proxy({
        method: httpMethod,
        path: '/oauth2/token',
        body: validatedBody,
        sanitizedHeaders,
        parsedUrl: config.cognitoUrl,
        clientSecret: await getClientSecret(),
      });

      console.log(logMessages.ATTESTATION_COMPLETED);

      return response;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (true) {
        case error instanceof ZodError:
          console.error(
            logMessages.ERROR_VALIDATION_ZOD,
            error.message,
            error.issues,
          );
          return generateErrorResponse({
            statusCode: 400,
            message: 'Invalid Request',
          });
        case error instanceof TokenExpiredError:
          console.error(
            logMessages.ERROR_ATTESTATION_TOKEN_EXPIRED,
            error.message,
          );
          return generateErrorResponse({
            statusCode: 401,
            message: 'Attestation token has expired',
          });
        case error instanceof JsonWebTokenError:
          console.error(
            logMessages.ERROR_ATTESTATION_JWT_INVALID,
            error.message,
          );
          return generateErrorResponse({
            statusCode: 401,
            message: 'Attestation token is invalid',
          });
        case error instanceof UnknownAppError:
          console.error(
            logMessages.ERROR_ATTESTATION_APP_UNKNOWN,
            error.message,
          );
          return generateErrorResponse({
            statusCode: 401,
            message: 'Unknown app associated with attestation token',
          });
        case error instanceof FailedToFetchSecretError:
          console.error(
            logMessages.ERROR_CONFIG_SECRET_FETCH_FAILED,
            error.message,
          );
          return generateErrorResponse({
            statusCode: 500,
            message: 'Internal server error, server missing key dependencies',
          });
        default:
          console.error(logMessages.ERROR_UNHANDLED_INTERNAL, error); // Catch-all for unexpected errors
          return generateErrorResponse({
            statusCode: 500,
            message: 'Internal server error',
          });
      }
    }
  };
