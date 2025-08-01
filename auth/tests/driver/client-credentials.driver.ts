import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class ClientCredentialsDriver {
  private readonly sharedSignalSecretName: string;
  private readonly cognitoDomain: string;

  constructor(sharedSignalSecretName: string, cognitoDomain: string) {
    this.sharedSignalSecretName = sharedSignalSecretName;
    this.cognitoDomain = cognitoDomain;
  }

  public async getAccessToken(): Promise<string> {
    const secretsConfig: SecretsConfig =
      await this.getSharedSignalSecretConfig();
    const config: AxiosRequestConfig = await this.constructAxiosRequestConfig(
      secretsConfig,
    );

    const response = await axios(config);
    return response.data.access_token;
  }

  public async getAccessTokenWithCustomCredentials(
    secretsConfig: SecretsConfig,
  ): Promise<string> {
    const config: AxiosRequestConfig = await this.constructAxiosRequestConfig(
      secretsConfig,
    );

    const response: AxiosResponse = await axios(config);
    return response.data.access_token;
  }

  async constructAxiosRequestConfig(
    secretsConfig: SecretsConfig,
  ): Promise<AxiosRequestConfig> {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const data = {
      grant_type: 'client_credentials',
      client_id: secretsConfig.clientId,
      client_secret: secretsConfig.clientSecret,
    };

    const authUrl = `https://${this.cognitoDomain}/oauth2/token`;

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: authUrl,
      data,
      headers,
    };

    return config;
  }

  private async getSharedSignalSecretConfig() {
    const secretsManagerClient = new SecretsManagerClient({
      region: 'eu-west-2',
    });

    const command = new GetSecretValueCommand({
      SecretId: this.sharedSignalSecretName,
    });

    const secretValue: GetSecretValueCommandOutput =
      await secretsManagerClient.send(command);

    const secretsConfig: SecretsConfig = JSON.parse(
      secretValue.SecretString!,
    ) as SecretsConfig;
    return secretsConfig;
  }
}

export interface SecretsConfig {
  clientId: string;
  clientSecret: string;
  userPoolId: string;
}
