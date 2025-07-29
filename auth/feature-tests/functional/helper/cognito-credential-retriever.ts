import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export class CognitoCredentialRetriever {
  private cognitoIdentityServiceProvider: CognitoIdentityProviderClient;

  constructor() {
    this.cognitoIdentityServiceProvider = new CognitoIdentityProviderClient({
      region: 'eu-west-2',
    });
  }

  async retrieveCognitoCredentials(config: {
    userPoolId: string;
    clientId: string;
  }): Promise<{ clientId: string; clientSecret?: string }> {
    const userPoolId = config.userPoolId;
    const sharedSignalClientId = config.clientId;

    if (!userPoolId || !sharedSignalClientId) {
      throw new Error(
        'Missing required environment variables: CFN_UserPoolId or CFN_SharedSignalClientId',
      );
    }

    try {
      const command = new DescribeUserPoolClientCommand({
        ClientId: sharedSignalClientId,
        UserPoolId: userPoolId,
      });

      const response = await this.cognitoIdentityServiceProvider.send(command);

      const clientId = response.UserPoolClient?.ClientId;
      const clientSecret = response.UserPoolClient?.ClientSecret; // Potentially undefined

      if (!clientId) {
        throw new Error('Could not retrieve Cognito Client ID');
      }

      return { clientId, clientSecret };
    } catch (error) {
      console.error('Error fetching Cognito client credentials', error);
      throw error; // Re-throw to be handled by caller.
    }
  }
}
