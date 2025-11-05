import { createResponse } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';
import type { APIGatewayProxyResult } from 'aws-lambda';

export const handleSignalVerification =
  async (): Promise<APIGatewayProxyResult> => {
    return Promise.resolve(createResponse(StatusCodes.ACCEPTED));
  };
