import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { generateResponse } from "../response";
import type { accountPurgedSchema } from "../schema/account-purged";
import type { APIGatewayProxyResult } from "aws-lambda";
import type { z } from "zod";
import { adminDeleteUser } from "../cognito/delete-user";

export type AccountPurgedRequest = z.infer<typeof accountPurgedSchema>;

export const handleAccountPurgedRequest = async (
  accountPurgedRequest: AccountPurgedRequest
): Promise<APIGatewayProxyResult> => {
  const userId =
    accountPurgedRequest.events[
      "https://schemas.openid.net/secevent/risc/event-type/account-purged"
    ].subject.uri;

  const isUserDeleted = await adminDeleteUser(userId);

  if (isUserDeleted) {
    return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
  } else {
    console.error("User deletion failed");
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR
    );
  }
};
