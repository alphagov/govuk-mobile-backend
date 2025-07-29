import type { SecretsConfig } from './secrets-service';
import { SecretsService } from './secrets-service';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { StatusCodes } from 'http-status-codes';
import type { SharedSignalsHealthCheck } from '../interface/health-check';
import { AuthError, VerifyError } from '../errors';

export class SharedSignalsHealthCheckService
  implements SharedSignalsHealthCheck
{
  private readonly healthCheckTokenUrl: string;
  private readonly healthCheckVerifyUrl: string;
  private readonly healthCheckSecretName: string;
  private readonly secretsService: SecretsService;

  public constructor(
    region: string,
    healthCheckTokenUrl: string,
    healthCheckVerifyUrl: string,
    healthCheckSecretName: string,
  ) {
    this.secretsService = new SecretsService(region);
    this.healthCheckTokenUrl = healthCheckTokenUrl;
    this.healthCheckVerifyUrl = healthCheckVerifyUrl;
    this.healthCheckSecretName = healthCheckSecretName;
  }

  public async authorise(): Promise<string> {
    try {
      const secret = await this.secretsService.getSecret(
        this.healthCheckSecretName,
      );

      if (secret === undefined) {
        throw new AuthError(
          `Failed to retrieve secret for ${this.healthCheckSecretName}`,
        );
      }

      const axiosConfig: AxiosRequestConfig =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        this.constructAuthoriseAxiosRequestConfig(secret as SecretsConfig);

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
    } catch (error) {
      throw new AuthError(
        `Failed to authorise: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  public async verify(token: string): Promise<boolean> {
    try {
      let isVerified = false;
      const axiosConfig: AxiosRequestConfig =
        this.constructVerifyAxiosRequestConfig(token);
      const response = await axios(axiosConfig);
      isVerified = response.status === StatusCodes.NO_CONTENT.valueOf();
      if (isVerified) {
        console.info('Token verification successful');
      } else {
        throw new VerifyError(
          `Failed to verify: ${response.status.toString()} ${
            response.statusText
          }`,
        );
      }
      return isVerified;
    } catch (error) {
      throw new VerifyError(
        `Failed to verify: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
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
