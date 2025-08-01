import type z from 'zod';
import { accountPurgedSchema } from '../schema/account-purged';
import { credentialChangeSchema } from '../schema/credential-change';
import { handleCredentialChangeRequest } from './credential-change-handler';
import { handleAccountPurgedRequest } from './account-purged-handler';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { generateResponse } from '../response';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

interface Handler {
  schema: z.ZodTypeAny;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  handle: (data: any) => Promise<APIGatewayProxyResult>;
}

const handlers: Handler[] = [
  {
    schema: credentialChangeSchema,
    handle: handleCredentialChangeRequest,
  },
  { schema: accountPurgedSchema, handle: handleAccountPurgedRequest },
];

/**
 * Handles incoming requests by parsing the body and routing to the appropriate handler.
 * @param body - The request body as a string.
 * @returns A promise that resolves to an APIGatewayProxyResult.
 */
export const requestHandler = async (
  body: string,
): Promise<APIGatewayProxyResult> => {
  let jsonBody: unknown = undefined;
  try {
    jsonBody = JSON.parse(body);

    for (const { schema, handle } of handlers) {
      if (schema.safeParse(jsonBody).success) {
        return await handle(jsonBody);
      }
    }

    return generateResponse(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST);
  } catch {
    return generateResponse(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST);
  }
};
