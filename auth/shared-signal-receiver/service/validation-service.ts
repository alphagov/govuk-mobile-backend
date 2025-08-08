/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { verifyUsername } from '../cognito/verify-users';
import { logMessages } from '../log-messages';

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
    console.warn(logMessages.SIGNAL_WARN_USER_NOT_FOUND, {
      userId: username,
      correlationId: jti,
    });
    return false;
  }
  return true;
};

const isChangeTypeValid = (
  incomingRequest: any,
  schemaName: string,
  changeType?: string,
): boolean => {
  if (changeType === undefined) {
    return true;
  }
  const jti = incomingRequest.jti as string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
  const schema = (incomingRequest as { events: Record<string, any> }).events[
    schemaName
  ];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const incomingChangeType = schema.change_type;
  if (incomingChangeType !== changeType) {
    console.error(logMessages.SIGNAL_ERROR_UNKNOWN_CHANGE_TYPE, {
      userId: schema.subject.uri as string,
      correlationId: jti,
      changeType: incomingChangeType as string,
    });
    return false;
  }

  return true;
};

export { isUserValid, isChangeTypeValid };
