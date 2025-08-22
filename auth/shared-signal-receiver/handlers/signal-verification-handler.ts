import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { generateResponse } from '../response';
import type { APIGatewayProxyResult } from 'aws-lambda';

export const handleSignalVerification =
  async (): Promise<APIGatewayProxyResult> => {
    return Promise.resolve(
      generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED),
    );
  };
