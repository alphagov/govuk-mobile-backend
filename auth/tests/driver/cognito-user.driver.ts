import {
  AdminDeleteUserCommand,
  AdminDeleteUserCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { TestLambdaDriver } from './testLambda.driver';

export class CognitoUserDriver {
  private readonly userPoolId: string;
  lambdaDriver: TestLambdaDriver;

  constructor(userPoolId: string, lambdaDriver: TestLambdaDriver) {
    this.userPoolId = userPoolId;
    this.lambdaDriver = lambdaDriver;
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
}
