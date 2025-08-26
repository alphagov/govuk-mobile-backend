import {
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from './client';
import { toCognitoUsername } from '../common/toCognitoUsername';

export const verifyUsername = async (username: string): Promise<boolean> => {
  try {
    const poolId = process.env['USER_POOL_ID'];

    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: poolId,
      Username: toCognitoUsername(username),
    });

    await cognitoClient.send(getUserCommand);
    return true;
  } catch (error) {
    if (error instanceof UserNotFoundException) {
      console.error('User not found', error);
      return false;
    }
    // bubble up any other errors
    throw error;
  }
};
