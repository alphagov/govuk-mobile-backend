import { generateResponse } from '../response';
import type { credentialChangeSchema } from '../schema/credential-change';
import type { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { adminGlobalSignOut } from '../cognito/sign-out-user';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { logMessages } from '../log-messages';
import { logger } from '../logger';

export type CredentialChangeRequest = z.infer<typeof credentialChangeSchema>;

export const handleCredentialChangeRequest = async (
  credentialChangeRequest: CredentialChangeRequest,
): Promise<APIGatewayProxyResult> => {
  const { jti } = credentialChangeRequest;
  logger.info('jti: ', jti);

  const events =
    credentialChangeRequest.events[
      'https://schemas.openid.net/secevent/caep/event-type/credential-change'
    ];
  const userId = events.subject.uri;
  const isUserSignedOut = await adminGlobalSignOut(userId);

  if (!isUserSignedOut) {
    logger.error(logMessages.SIGNAL_ERROR_CREDENTIAL_CHANGE, {
      userId,
      jti,
      changeType: events.change_type,
    });
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  }

  logger.info(logMessages.SIGNAL_SUCCESS_CREDENTIAL_CHANGE, {
    userId,
    jti,
    credentialType: events.credential_type,
  });

  return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
};
