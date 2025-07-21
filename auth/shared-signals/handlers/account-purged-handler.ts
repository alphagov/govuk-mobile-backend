/* eslint-disable */ 
/* tslint:disable */
// @ts-ignore
// @ts-nocheck

import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { generateResponse } from "../response";
import type { accountPurgedSchema } from "../schema/account-purged";
import type { APIGatewayProxyResult } from "aws-lambda";

export const handleAccountPurgedRequest = async (

  data: typeof accountPurgedSchema
): Promise<APIGatewayProxyResult> => {
  return generateResponse(
    StatusCodes.NOT_IMPLEMENTED,
    ReasonPhrases.NOT_IMPLEMENTED
  );
};
