import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { StatusCodes } from 'http-status-codes';
import type { SharedSignalHealthCheck } from '../interface/health-check';
import { AuthError, VerifyError } from '../errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import type { SecretsConfig } from '../interface/secret-config';
import { logger } from '../logger';

export class SharedSignalHealthCheckService implements SharedSignalHealthCheck {
  private readonly healthCheckTokenUrl: string;
  private readonly healthCheckVerifyUrl: string;
  private readonly healthCheckSecretName: string;

  public constructor(
    healthCheckTokenUrl: string,
    healthCheckVerifyUrl: string,
    healthCheckSecretName: string,
  ) {
    this.healthCheckTokenUrl = healthCheckTokenUrl;
    this.healthCheckVerifyUrl = healthCheckVerifyUrl;
    this.healthCheckSecretName = healthCheckSecretName;
  }

  public async authorise(): Promise<string> {
    const secret = await getSecret(this.healthCheckSecretName);
    if (secret === undefined) {
      throw new AuthError(
        `Failed to retrieve secret for ${this.healthCheckSecretName}`,
      );
    }
    // prettier-ignore
    if (typeof secret !== 'string') {   // pragma: allowlist secret
      throw new AuthError(
        `Secret for ${this.healthCheckSecretName} is not a string`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const secretConfig: SecretsConfig = JSON.parse(secret) as SecretsConfig;
    const axiosConfig: AxiosRequestConfig =
      this.constructAuthoriseAxiosRequestConfig(secretConfig);
    const response = await axios<{ access_token: string }>(axiosConfig);

    if (response.status !== StatusCodes.OK.valueOf()) {
      throw new AuthError(
        `Failed to authorise: ${response.status.toString()} ${
          response.statusText
        }`,
      );
    }

    if (typeof response.data.access_token !== 'string') {
      throw new AuthError('Access token not found in response');
    }

    return response.data.access_token;
  }

  public async verify(token: string): Promise<boolean> {
    const axiosConfig: AxiosRequestConfig =
      this.constructVerifyAxiosRequestConfig(token);
    const response = await axios(axiosConfig);
    const isVerified = response.status === StatusCodes.NO_CONTENT.valueOf();
    if (!isVerified) {
      throw new VerifyError(
        `Failed to verify: ${response.status.toString()} ${
          response.statusText
        }`,
      );
    }
    logger.info('Token verification successful');
    return isVerified;
  }

  private constructAuthoriseAxiosRequestConfig(
    secretsConfig: SecretsConfig,
  ): AxiosRequestConfig {
    const base64Credentials = Buffer.from(
      `${secretsConfig.clientId}:${secretsConfig.clientSecret}`,
    ).toString('base64');
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${base64Credentials}`,
    };

    const data = {
      grant_type: 'client_credentials',
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: this.healthCheckTokenUrl,
      data,
      headers,
    };

    return config;
  }

  private constructVerifyAxiosRequestConfig(
    bearerToken: string,
  ): AxiosRequestConfig {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    };

    const data = {
      state: 'govuk-app-health-check',
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: this.healthCheckVerifyUrl,
      data,
      headers,
    };

    return config;
  }
}
