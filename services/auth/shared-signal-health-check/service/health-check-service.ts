import { StatusCodes } from 'http-status-codes';
import type { SharedSignalHealthCheck } from '../interface/health-check';
import { AuthError, VerifyError } from '../errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import type { SecretsConfig } from '../interface/secret-config';
import { logger } from '../logger';
import { sendHttpRequest } from '@libs/http-utils';
import querystring from 'node:querystring';

export class SharedSignalHealthCheckService implements SharedSignalHealthCheck {
  private readonly healthCheckTokenUrl: string;
  private readonly healthCheckVerifyUrl: string;
  private readonly healthCheckSecretName: string;

  private readonly state: string = 'govuk-app-health-check';

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
    const response = await sendHttpRequest({
      url: this.healthCheckTokenUrl,
      httpRequest: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${secretConfig.clientId}:${secretConfig.clientSecret}`,
          ).toString('base64')}`,
        },
        body: querystring.stringify({
          grant_type: 'client_credentials',
        }),
      },
      retryConfig: {
        timeoutMillis: this.getTimeoutInMillis(),
      },
    });

    if (response.status !== StatusCodes.OK.valueOf()) {
      throw new AuthError(
        `Failed to authorise: ${response.status.toString()} ${
          response.statusText
        }`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const body = (await response.json()) as { access_token: string };

    if (typeof body !== 'object' || typeof body.access_token !== 'string') {
      throw new AuthError('Access token not found in response');
    }

    return body.access_token;
  }

  public async verify(token: string): Promise<boolean> {
    const response = await sendHttpRequest({
      url: this.healthCheckVerifyUrl,
      httpRequest: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          state: this.state,
        }),
      },
      retryConfig: {
        timeoutMillis: this.getTimeoutInMillis(),
      },
    });

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

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private getTimeoutInMillis(): number {
    return process.env['HEALTH_CHECK_TIMEOUT_MS'] != null
      ? Number(process.env['HEALTH_CHECK_TIMEOUT_MS'])
      : // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        3000;
  }
}
