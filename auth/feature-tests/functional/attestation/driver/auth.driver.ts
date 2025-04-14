import 'dotenv/config'

import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthRequest } from "@aws-sdk/client-cognito-identity-provider";

export type InitiateAuthInput = {
    username: string;
    password: string;
    attestationToken: string;
}

export class AuthDriver {
  private cognitoClient: CognitoIdentityProviderClient;
  private clientId: string;

  constructor(clientId: string, region: string) {
    this.clientId = clientId;
    this.cognitoClient = new CognitoIdentityProviderClient({ region });
  }

  /**
   * Initiates the authentication process as a client application.
   * This method simulates the initial step where an app with only a client ID
   * requests authentication. It typically results in a challenge being issued
   * by Cognito (e.g., SMS_MFA, PASSWORD_VERIFIER).
   *
   * @returns A Promise that resolves to the InitiateAuthCommandOutput from Cognito.
   * @throws Error if the initiation process fails.
   */
  async initiateAuth({
    username, 
    password,
    attestationToken
}: InitiateAuthInput): Promise<any> {
    const authParams: InitiateAuthRequest = {
      AuthFlow: "USER_PASSWORD_AUTH", // Or USER_SRP_AUTH if you intend to use SRP
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientMetadata: {
        attestationToken
      }
    };

    try {
      const command = new InitiateAuthCommand(authParams);
      const response = await this.cognitoClient.send(command);
      return response;
    } catch (error: any) {
      console.error("Error initiating authentication:", error);
      throw new Error(`Failed to initiate authentication: ${error.message}`);
    }
  }
}