import type z from "zod";
import { parseRequest } from "../parser";
import { accountPurgedSchema } from "../schema/account-purged";
import { credentialChangeSchema } from "../schema/credential-change";
import { handleCredentialChangeRequest } from "./credential-change-handler";
import { handleAccountPurgedRequest } from "./account-purged-handler";
import type { APIGatewayProxyResult } from "aws-lambda";
import { generateResponse } from "../response";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

const handlers: {
  schema: z.ZodTypeAny;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  handle: (data: any) => Promise<APIGatewayProxyResult>;
}[] = [
  {
    schema: credentialChangeSchema,
    handle: handleCredentialChangeRequest,
  },
  { schema: accountPurgedSchema, handle: handleAccountPurgedRequest },
];

export const requestHandler = async (
  body: string
): Promise<APIGatewayProxyResult> => {
  let jsonBody: unknown = undefined;
  try {
    jsonBody = JSON.parse(body);
  } catch {
    return generateResponse(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST);
  }

  const parsed = parseRequest(jsonBody);
  
  console.log("CorrelationId: ", parsed.jti);  // Log the correlation ID for tracing
  
  for (const { schema, handle } of handlers) {
    if (schema.safeParse(parsed).success) {
      return handle(parsed);
    }
  }

  throw new Error("No handler found for parsed input");
};
