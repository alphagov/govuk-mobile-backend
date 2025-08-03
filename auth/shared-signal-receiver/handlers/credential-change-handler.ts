import { generateResponse } from '../response';
import type { credentialChangeSchema } from '../schema/credential-change';
import type { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { adminGlobalSignOut } from '../cognito/sign-out-user';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { adminUpdateEmailAddress } from '../cognito/update-email-address';
import { logMessages } from '../log-messages';
import { UserNotFoundException } from '@aws-sdk/client-cognito-identity-provider';
import { verifyUserExists } from '../cognito/verify-users';

export type CredentialChangeRequest = z.infer<typeof credentialChangeSchema>;

enum ChangeType {
  UNKNOWN = 0,
  UPDATE_PASSWORD = 1,
  UPDATE_EMAIL_ADDRESS = 2,
}

const getCredentialChangeType = (
  credentialChangeRequest: CredentialChangeRequest,
): ChangeType => {
  const events =
    credentialChangeRequest.events[
      'https://schemas.openid.net/secevent/caep/event-type/credential-change'
    ];

  if (
    events.change_type === 'update' &&
    events.credential_type === 'password'
  ) {
    return ChangeType.UPDATE_PASSWORD;
  } else if (
    events.change_type === 'update' &&
    events.credential_type === 'email'
  ) {
    return ChangeType.UPDATE_EMAIL_ADDRESS;
  }

  return ChangeType.UNKNOWN;
};

const handlePasswordChange = async (
  userId: string,
  correlationId: string,
): Promise<APIGatewayProxyResult> => {
  const isUserSignedOut = await adminGlobalSignOut(userId);

  if (isUserSignedOut) {
    console.info(logMessages.SIGNAL_SUCCESS_PASSWORD_UPDATE, {
      userId,
      correlationId,
    });
    return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
  } else {
    console.error(logMessages.SIGNAL_ERROR_PASSWORD_UPDATE, {
      userId,
      correlationId,
    });
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  }
};

const handleEmailUpdate = async (
  userId: string,
  email: string,
  correlationId: string,
): Promise<APIGatewayProxyResult> => {
  let isUserSignedOut = false;
  try {
    isUserSignedOut = await adminGlobalSignOut(userId);
  } catch (error) {
    if (error instanceof UserNotFoundException) {
      console.warn(logMessages.SIGNAL_WARN_USER_NOT_FOUND, {
        userId,
        correlationId,
      });
      return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
    }
  }

  const isEmailChanged = await adminUpdateEmailAddress(userId, email);

  if (isUserSignedOut && isEmailChanged) {
    console.info(logMessages.SIGNAL_SUCCESS_EMAIL_UPDATE, {
      userId,
      correlationId,
    }); // do not log email for security reasons
    return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
  } else {
    console.error(logMessages.SIGNAL_ERROR_EMAIL_UPDATE, {
      userId,
      correlationId,
    }); // do not log email for security reasons
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  }
};

export const handleCredentialChangeRequest = async (
  credentialChangeRequest: CredentialChangeRequest,
): Promise<APIGatewayProxyResult> => {
  try {
    console.info('CorrelationId: ', credentialChangeRequest.jti);
    const events =
      credentialChangeRequest.events[
        'https://schemas.openid.net/secevent/caep/event-type/credential-change'
      ];
    const userId = events.subject.uri;
    const changeType = getCredentialChangeType(credentialChangeRequest);
    const correlationId = credentialChangeRequest.jti;

    if (changeType === ChangeType.UNKNOWN) {
      console.error(logMessages.SIGNAL_ERROR_UNKNOWN_CHANGE_TYPE, {
        userId: userId,
        correlationId: correlationId,
        changeType: events.change_type,
      });

      return generateResponse(
        StatusCodes.BAD_REQUEST,
        ReasonPhrases.BAD_REQUEST,
      );
    }

    // verify if user exists before processing the request
    if (!(await verifyUserExists(userId))) {
      // User does not exist, log and return accepted response
      console.warn(logMessages.SIGNAL_WARN_USER_NOT_FOUND, {
        userId: userId,
        correlationId: correlationId,
        requestType: ChangeType[changeType],
      });

      // Return accepted response
      return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
    }

    if (changeType === ChangeType.UPDATE_PASSWORD) {
      return await handlePasswordChange(userId, correlationId);
    }

    const emailAddress =
      credentialChangeRequest.events[
        'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation'
      ]?.email;
    if (emailAddress == undefined) {
      console.error('Email address missing for email update');
      return generateResponse(
        StatusCodes.BAD_REQUEST,
        ReasonPhrases.BAD_REQUEST,
      );
    }

    return await handleEmailUpdate(userId, emailAddress, correlationId);
  } catch (e) {
    console.error(
      `${logMessages.SIGNAL_ERROR_CREDENTIAL_CHANGE} CorrelationId - ${credentialChangeRequest.jti}`,
      e,
    );
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  }
};
