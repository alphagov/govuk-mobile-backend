import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { LoginUserInput } from '../types/user';

export class TestDataLoader {
  client: SecretsManagerClient;
  stackName: string;
  constructor(region: string, stackName: string) {
    this.client = new SecretsManagerClient({
      region,
    });
    this.stackName = stackName;
  }

  private parseParameterAsUser(
    parameterValue: string | undefined,
  ): LoginUserInput {
    if (!parameterValue) {
      throw new Error('Parameter value is undefined');
    }

    let user;
    try {
      user = JSON.parse(parameterValue);
    } catch (error) {
      throw new Error(`Failed to parse parameter value as JSON: ${error}`);
    }

    return {
      email: user.email,
      password: user.password,
      totpSecret: user.totpSecret,
    };
  }

  public async getSuccessfulSignInUser() {
    const user = await this.client.send(
      new GetSecretValueCommand({
        SecretId: `/${this.stackName}/test-data/successful-sign-in-user`,
      }),
    );

    return this.parseParameterAsUser(user.SecretString);
  }

  public async getSharedSignalsUser() {
    const user = await this.client.send(
      new GetSecretValueCommand({
        SecretId: `/${this.stackName}/test-data/shared-signals-user`,
      }),
    );

    return this.parseParameterAsUser(user.SecretString);
  }
}
