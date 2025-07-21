import type { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { ZodError } from "zod";
import { logMessages } from "./log-messages";
import { generateResponse } from "./response";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { CognitoError } from "./errors";
import { requestHandler } from "./handlers/request-handler";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Shared signals receiver called");
  try {
    if (event.body == undefined || event.body === "") {
      return generateResponse(
        StatusCodes.BAD_REQUEST,
        ReasonPhrases.BAD_REQUEST
      );
    }
    return await requestHandler(event.body);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof ZodError:
        console.error(
          logMessages.ERROR_VALIDATION_ZOD,
          error.message,
          error.issues
        );
        return generateResponse(
          StatusCodes.BAD_REQUEST,
          ReasonPhrases.BAD_REQUEST
        );
      case error instanceof CognitoError:
        console.error(logMessages.ERROR_COGNITO, error);
        return generateResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          ReasonPhrases.INTERNAL_SERVER_ERROR
        );
      default:
        console.error(logMessages.ERROR_UNHANDLED_INTERNAL, error);
        return generateResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          ReasonPhrases.INTERNAL_SERVER_ERROR
        );
    }
  }
};
