import type {
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
  Context,
} from 'aws-lambda';
import { ZodError } from 'zod';
import { logMessages } from './log-messages';
import { generateErrorResponse, generateResponse } from './response';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import {
  CognitoError,
  SignatureVerificationError,
  InvalidRequestError,
  InvalidKeyError,
} from './errors';
import type { Dependencies } from './app';
import { logger } from './logger';

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
  async (
    event: APIGatewayProxyEvent,
    context: Context,
  ): Promise<APIGatewayProxyResult> => {
    logger.logEventIfEnabled(event);
    logger.setCorrelationId(event.requestContext.requestId);
    logger.addContext(context);
    logger.info(logMessages.SIGNAL_RECEIVER_CALLED);
    try {
      if (event.body == undefined || event.body === '') {
        return generateResponse(
          StatusCodes.BAD_REQUEST,
          ReasonPhrases.BAD_REQUEST,
        );
      }

      const config = dependencies.getConfig();
      const payload = await dependencies.verifySETJwt({
        jwt: event.body,
        config,
      });

      return await dependencies.requestHandler(payload);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (true) {
        case error instanceof ZodError:
          logger.error(logMessages.ERROR_VALIDATION_ZOD, {
            error: {
              message: error.message,
              issues: error.issues,
            },
          });
          return generateResponse(
            StatusCodes.BAD_REQUEST,
            ReasonPhrases.BAD_REQUEST,
          );
        case error instanceof CognitoError:
          logger.error(logMessages.ERROR_COGNITO, { error });
          return generateResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR,
          );
        case error instanceof SignatureVerificationError:
        case error instanceof InvalidRequestError:
        case error instanceof InvalidKeyError:
          logger.error(logMessages.SET_TOKEN_VERIFICATION_ERROR, { error });
          return generateErrorResponse(StatusCodes.BAD_REQUEST, {
            errorCode: error.name,
            errorDescription: error.message,
          });
        default:
          logger.error(logMessages.ERROR_UNHANDLED_INTERNAL, { error });
          return generateResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            ReasonPhrases.INTERNAL_SERVER_ERROR,
          );
      }
    }
  };
