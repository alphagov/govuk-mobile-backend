import { createResponse } from '@libs/http-utils';
import { StatusCodes } from 'http-status-codes';
import type { accountPurgedSchema } from '../schema/account-purged';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { adminDeleteUser } from '../cognito/delete-user';
import { adminGlobalSignOut } from '../cognito/sign-out-user';
import { logMessages } from '../log-messages';
import { logger } from '../logger';

export type AccountPurgedRequest = z.infer<typeof accountPurgedSchema>;

export const handleAccountPurgedRequest = async (
  accountPurgedRequest: AccountPurgedRequest,
): Promise<APIGatewayProxyResult> => {
  const { jti } = accountPurgedRequest;
  logger.info('jti: ', jti);
  const userId =
    accountPurgedRequest.events[
      'https://schemas.openid.net/secevent/risc/event-type/account-purged'
    ].subject.uri;

  await adminGlobalSignOut(userId);
  const isUserDeleted = await adminDeleteUser(userId);

  if (isUserDeleted) {
    logger.info(logMessages.SIGNAL_SUCCESS_ACCOUNT_PURGE, {
      userId,
      jti,
    });
    return createResponse(StatusCodes.ACCEPTED);
  } else {
    logger.error(logMessages.SIGNAL_ERROR_ACCOUNT_PURGE, {
      userId,
      jti,
    });

    return createResponse(StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
