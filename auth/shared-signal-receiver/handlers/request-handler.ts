/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import type z from 'zod';
import { accountPurgedSchema } from '../schema/account-purged';
import { credentialChangeSchema } from '../schema/credential-change';
import { handleCredentialChangeRequest } from './credential-change-handler';
import { handleAccountPurgedRequest } from './account-purged-handler';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { generateResponse } from '../response';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { CognitoError } from '../errors';
import { isChangeTypeValid, isUserValid } from '../service/validation-service';
import { logMessages } from '../log-messages';

interface Handler {
  schema: z.ZodType;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  handle: (data: any) => Promise<APIGatewayProxyResult>;
  schemaName: string;
  allowedChangeType?: string;
}

const handlers: Handler[] = [
  {
    schema: credentialChangeSchema,
    handle: handleCredentialChangeRequest,
    schemaName:
      'https://schemas.openid.net/secevent/caep/event-type/credential-change',
    allowedChangeType: 'update',
  },
  {
    schema: accountPurgedSchema,
    handle: handleAccountPurgedRequest,
    schemaName:
      'https://schemas.openid.net/secevent/risc/event-type/account-purged',
  },
];

/**
 * Handles incoming requests by parsing the body and routing to the appropriate handler.
 * @param jsonBody - The request body as a string.
 * @returns A promise that resolves to an APIGatewayProxyResult.
 */
export const requestHandler = async (
  jsonBody: unknown,
): Promise<APIGatewayProxyResult> => {
  const isDisabled = process.env['ENABLE_SHARED_SIGNAL'] !== 'true';
  if (isDisabled) {
    console.error(
      logMessages.SIGNAL_DISABLED,
      'Shared signal feature is disabled',
    );
    return generateResponse(
      StatusCodes.SERVICE_UNAVAILABLE,
      ReasonPhrases.SERVICE_UNAVAILABLE,
    );
  }
  try {
    for (const { schema, handle, schemaName, allowedChangeType } of handlers) {
      if (schema.safeParse(jsonBody).success) {
        if (!isChangeTypeValid(jsonBody, schemaName, allowedChangeType)) {
          return generateResponse(
            StatusCodes.BAD_REQUEST,
            ReasonPhrases.BAD_REQUEST,
          );
        }
        if (!(await isUserValid(jsonBody, schemaName))) {
          return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
        }
        return await handle(jsonBody);
      }
    }

    return generateResponse(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST);
  } catch (error) {
    if (error instanceof CognitoError) {
      return generateResponse(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
    }
    return generateResponse(StatusCodes.BAD_REQUEST, ReasonPhrases.BAD_REQUEST);
  }
};
