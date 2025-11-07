import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { generateResponse } from '@libs/http-utils';
import type { APIGatewayProxyResult } from 'aws-lambda';

export const handleSignalVerification =
  async (): Promise<APIGatewayProxyResult> => {
    return Promise.resolve(
      generateResponse({
        status: StatusCodes.ACCEPTED,
        message: ReasonPhrases.ACCEPTED,
      }),
    );
  };
