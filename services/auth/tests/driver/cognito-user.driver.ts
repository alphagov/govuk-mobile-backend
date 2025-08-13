import {
  AdminCreateUserCommand,
  AdminCreateUserRequest,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  AdminDeleteUserCommandInput,
  AdminCreateUserResponse,
  AdminGetUserResponse,
} from '@aws-sdk/client-cognito-identity-provider';
import { TestLambdaDriver } from './testLambda.driver';

export class CognitoUserDriver {
  private readonly userPoolId: string;
  lambdaDriver: TestLambdaDriver;

  constructor(userPoolId: string, lambdaDriver: TestLambdaDriver) {
    this.userPoolId = userPoolId;
    this.lambdaDriver = lambdaDriver;
  }

  public async createCognitoUserAndReturnUserName(
    username: string,
  ): Promise<string> {
    const input = {
      UserPoolId: this.userPoolId,
      Username: username,
      // suppress email sending
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        {
          Name: 'email',
          Value: username,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
    } as AdminCreateUserRequest;

    const command = new AdminCreateUserCommand(input);
    const response =
      await this.lambdaDriver.performAction<AdminCreateUserResponse>({
        command,
        action: 'AdminCreateUserCommand',
        service: 'CognitoIdentityProviderClient',
      });

    return response.User?.Username!;
  }

  public async deleteUserFromCognito(username: string): Promise<void> {
    const input = {
      UserPoolId: this.userPoolId,
      Username: username,
    } as AdminDeleteUserCommandInput;
    const command = new AdminDeleteUserCommand(input);
    console.log('Deleting user from Cognito:', username);
    await this.lambdaDriver.performAction({
      command,
      action: 'AdminDeleteUserCommand',
      service: 'CognitoIdentityProviderClient',
    });
  }

  public async getUserAttributes(username: string): Promise<any> {
    const input = {
      UserPoolId: this.userPoolId,
      Username: username,
    } as AdminGetUserCommandInput;

    const command = new AdminGetUserCommand(input);
    const response =
      await this.lambdaDriver.performAction<AdminGetUserResponse>({
        command,
        action: 'AdminGetUserCommand',
        service: 'CognitoIdentityProviderClient',
      });
    return response.UserAttributes;
  }
}
