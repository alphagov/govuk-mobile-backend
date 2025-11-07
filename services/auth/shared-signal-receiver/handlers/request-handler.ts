import type z from 'zod';
import { accountPurgedSchema } from '../schema/account-purged';
import { credentialChangeSchema } from '../schema/credential-change';
import { handleCredentialChangeRequest } from './credential-change-handler';
import { handleAccountPurgedRequest } from './account-purged-handler';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { generateResponse } from '@libs/http-utils';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { isUserValid } from '../service/validation-service';
import { logMessages } from '../log-messages';
import { signalVerificationSchema } from '../schema/verification';
import { handleSignalVerification } from './signal-verification-handler';
import { logger } from '../logger';

interface Handler {
  schema: z.ZodType;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  handler: (data: any) => Promise<APIGatewayProxyResult>;
  schemaName: string;
  requiresUserValidation?: boolean;
}

const handlers: Handler[] = [
  {
    schema: credentialChangeSchema,
    handler: handleCredentialChangeRequest,
    schemaName:
      'https://schemas.openid.net/secevent/caep/event-type/credential-change',
  },
  {
    schema: accountPurgedSchema,
    handler: handleAccountPurgedRequest,
    schemaName:
      'https://schemas.openid.net/secevent/risc/event-type/account-purged',
  },
  {
    schema: signalVerificationSchema,
    handler: handleSignalVerification,
    schemaName:
      'https://schemas.openid.net/secevent/sse/event-type/verification',
    requiresUserValidation: false,
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
    logger.error(
      logMessages.SIGNAL_DISABLED,
      'Shared signal feature is disabled',
    );
    return generateResponse({
      status: StatusCodes.SERVICE_UNAVAILABLE,
      message: ReasonPhrases.SERVICE_UNAVAILABLE,
    });
  }

  for (const h of handlers) {
    if (h.schema.safeParse(jsonBody).success) {
      const shouldValidateUser = h.requiresUserValidation ?? true;
      if (shouldValidateUser) {
        if (!(await isUserValid(jsonBody, h.schemaName))) {
          return generateResponse({
            status: StatusCodes.ACCEPTED,
            message: ReasonPhrases.ACCEPTED,
          });
        }
      }
      return await h.handler(jsonBody);
    }
  }

  logger.error(logMessages.ERROR_UNKNOWN_SIGNAL);
  return generateResponse({
    status: StatusCodes.BAD_REQUEST,
    message: ReasonPhrases.BAD_REQUEST,
  });
};
