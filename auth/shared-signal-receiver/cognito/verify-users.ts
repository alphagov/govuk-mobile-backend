import {
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from './client';
import { CognitoError } from '../errors';

export const verifyUserExists = async (username: string): Promise<boolean> => {
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
