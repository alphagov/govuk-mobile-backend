import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { generateResponse } from '../response';
import type { accountPurgedSchema } from '../schema/account-purged';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { adminDeleteUser } from '../cognito/delete-user';
import { adminGlobalSignOut } from '../cognito/sign-out-user';
import { logMessages } from '../log-messages';

export type AccountPurgedRequest = z.infer<typeof accountPurgedSchema>;

export const handleAccountPurgedRequest = async (
  accountPurgedRequest: AccountPurgedRequest,
): Promise<APIGatewayProxyResult> => {
  console.info('CorrelationId: ', accountPurgedRequest.jti);
  const userId =
    accountPurgedRequest.events[
      'https://schemas.openid.net/secevent/risc/event-type/account-purged'
    ].subject.uri;

  const correlationId = accountPurgedRequest.jti;
  await adminGlobalSignOut(userId);
  const isUserDeleted = await adminDeleteUser(userId);

  if (isUserDeleted) {
    console.info(logMessages.SIGNAL_SUCCESS_ACCOUNT_PURGE, {
      userId,
      correlationId,
    });
    return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
  } else {
    console.error(logMessages.SIGNAL_ERROR_ACCOUNT_PURGE, {
      userId,
      correlationId,
    });

    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  }
};
