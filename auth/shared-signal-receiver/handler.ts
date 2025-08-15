import type { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { ZodError } from 'zod';
import { logMessages } from './log-messages';
import { generateResponse } from './response';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { CognitoError, SignatureVerificationError } from './errors';
import type { Dependencies } from './app';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @param dependencies
 * @returns object - API Gateway Lambda Proxy Output Format
 */
export const createHandler =
  (dependencies: Dependencies) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(logMessages.SIGNAL_RECEIVER_CALLED);
    try {
      if (event.body == undefined || event.body === '') {
        return generateResponse(
          StatusCodes.BAD_REQUEST,
          ReasonPhrases.BAD_REQUEST,
        );
      }

      // eslint-disable-next-line @typescript-eslint/init-declarations
      let jsonBody: object;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        jsonBody = JSON.parse(event.body);
      } catch {
        return generateResponse(
          StatusCodes.BAD_REQUEST,
          ReasonPhrases.BAD_REQUEST,
        );
      }

      const config = dependencies.getConfig();
      const payload = await dependencies.verifySETJwt({
        jwt: jsonBody,
        config,
      });

      return await dependencies.requestHandler(payload);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (true) {
        case error instanceof ZodError:
          console.error(
            logMessages.ERROR_VALIDATION_ZOD,
            error.message,
            error.issues,
          );
          return generateResponse(
            StatusCodes.BAD_REQUEST,
            ReasonPhrases.BAD_REQUEST,
          );
        case error instanceof CognitoError:
          console.error(logMessages.ERROR_COGNITO, error);
          return generateResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR,
          );
        case error instanceof SignatureVerificationError:
          console.error(logMessages.SET_TOKEN_VERIFICATION_ERROR, error);
          return generateResponse(
            StatusCodes.BAD_REQUEST,
            ReasonPhrases.BAD_REQUEST,
          );
        default:
          console.error(logMessages.ERROR_UNHANDLED_INTERNAL, error);
          return generateResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR,
          );
      }
    }
  };
