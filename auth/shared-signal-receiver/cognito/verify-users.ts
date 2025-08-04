import {
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from './client';
import { CognitoError } from '../errors';
import type { AccountPurgedSchema } from '../model/account-purged'; // Ensure this is a Zod schema instance, not just a type
import type { CredentialChangeSchema } from '../model/credential-change'; // Ensure this is a Zod schema instance, not just a type


export const verifyUsername = async (username: string): Promise<boolean> => {
  try {
    const poolId = process.env['USER_POOL_ID'];

    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: poolId,
      Username: username,
    });

    await cognitoClient.send(getUserCommand);
  } catch (error) {
    if (error instanceof UserNotFoundException) {
      console.error('User not found', error);
      return false;
    }
    console.error('Error other than UserNotFoundException:', error);
    throw new CognitoError('Failed to verify user existence');
  }

  return true;
};

const schemaCollectionMap = new Map<string, string>();
schemaCollectionMap.set(
  'account-purged',
  'https://schemas.openid.net/secevent/risc/event-type/account-purged'
);
schemaCollectionMap.set(
  'credential-change',
  'https://schemas.openid.net/secevent/caep/event-type/credential-change'
);

export const doesUserExists = async (incomingRequest: any): Promise<boolean> => {
  const jti = incomingRequest.jti;
  const accountPurgeEventSchema = 'https://schemas.openid.net/secevent/risc/event-type/account-purged';
  const credentialChangeEventSchema = 'https://schemas.openid.net/secevent/caep/event-type/credential-change';
  let schema = (incomingRequest as AccountPurgedSchema).events[accountPurgeEventSchema];
  if (!schema) {
    schema = (incomingRequest as CredentialChangeSchema).events[credentialChangeEventSchema];
  }

  console.info('Verifying user');

  const username = schema?.subject?.uri;

  if (!username) {
    console.error('Username not found in the request');
    throw new CognitoError('Username is required to verify user existence');
  }

  if (!await verifyUsername(username)) {
    console.warn("User not found in Verify User", {
      userId: username,
      correlationId: jti});
    
    return false;
  }
  return true;
};  
