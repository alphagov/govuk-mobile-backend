import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoCredentials } from './types';

let cachedClientSecret: CognitoCredentials | null = null;

export const retrieveCognitoCredentials = async (
  config: {
    clientId: string;
  },
  cognitoIdentityServiceProvider: CognitoIdentityProviderClient,
  cachedClientSecretOverride: CognitoCredentials | null = null,
): Promise<CognitoCredentials> => {
  if (cachedClientSecretOverride != null) {
    console.log('Using cached client secret');
    return cachedClientSecretOverride;
  }
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
    cachedClientSecret = { clientId, clientSecret };
    return cachedClientSecret;
  } catch (error) {
    console.error('Error fetching Cognito client credentials', error);
    throw error; // Re-throw to be handled by caller.
  }
};
