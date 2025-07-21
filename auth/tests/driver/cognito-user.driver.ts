import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminCreateUserRequest,
  AdminDeleteUserCommand,
  AdminDeleteUserRequest,
} from "@aws-sdk/client-cognito-identity-provider";

export class CognitoUserDriver {
  private readonly userPoolId: string;

  constructor(userPoolId: string) {
    this.userPoolId = userPoolId;
  }

  public async createCognitoUserAndReturnUserName(
    username: string
  ): Promise<string> {
    const client = new CognitoIdentityProviderClient({
      region: "eu-west-2",
    });

    const input = {
      UserPoolId: this.userPoolId,
      Username: username,
      UserAttributes: [
        {
          Name: "email",
          Value: username,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
    } as AdminCreateUserRequest;

    const command = new AdminCreateUserCommand(input);
    const response = await client.send(command);
    return response.User?.Username!;
  }

  public async deleteUserFromCognito(username: string): Promise<void> {
    const client = new CognitoIdentityProviderClient({
      region: "eu-west-2",
    });
    const input = {
      UserPoolId: this.userPoolId,
      Username: username,
    } as AdminDeleteUserRequest;
    const command = new AdminDeleteUserCommand(input);
    await client.send(command);
  }
}
