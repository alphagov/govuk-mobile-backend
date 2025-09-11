/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { verifyUsername } from '../cognito/verify-users';
import { logMessages } from '../log-messages';
import { logger } from '../logger';

const isUserValid = async (
  incomingRequest: any,
  schemaName: string,
): Promise<boolean> => {
  const jti = incomingRequest.jti as string;

  // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-assignment
  const schema = (incomingRequest as { events: Record<string, any> }).events[
    schemaName
  ];

  const username = schema.subject.uri as string;

  const isValid = await verifyUsername(username);

  if (!isValid) {
    logger.warn(logMessages.SIGNAL_WARN_USER_NOT_FOUND, {
      userId: username,
      correlationId: jti,
    });
    return false;
  }
  return true;
};

export { isUserValid };
