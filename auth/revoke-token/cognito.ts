import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoCredentials } from './types';

export const retrieveCognitoCredentials = async (
  config: {
    clientId: string;
  },
  cognitoIdentityServiceProvider: CognitoIdentityProviderClient,
): Promise<CognitoCredentials> => {
  const userPoolId = process.env['USER_POOL_ID'];

  if (userPoolId == null || userPoolId == '') {
    throw new Error('Missing required environment variables: USER_POOL_ID');
  }

  try {
    const command = new DescribeUserPoolClientCommand({
      ClientId: config.clientId,
      UserPoolId: userPoolId,
    });

    const response = await cognitoIdentityServiceProvider.send(command);

    const clientId = response.UserPoolClient?.ClientId;
    const clientSecret = response.UserPoolClient?.ClientSecret;

    if (clientId === undefined || clientId == '') {
      throw new Error('Could not retrieve Cognito Client ID');
    }

    if (clientSecret === undefined || clientSecret == '') {
      throw new Error('Could not retrieve Cognito Client Secret');
    }
    return { clientId, clientSecret };
  } catch (error) {
    console.error('Error fetching Cognito client credentials', error);
    throw error; // Re-throw to be handled by caller.
  }
};
