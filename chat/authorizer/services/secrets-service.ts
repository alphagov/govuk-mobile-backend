import type { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

/**
 * @param config as string
 * @returns SecretsConfig object
 */
function parseSecretsConfig(config: string): SecretsConfig {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const secretsConfig: SecretsConfig = JSON.parse(config) as SecretsConfig;
  return secretsConfig;
}

export class SecretsService {
  private secretsManagerClient: SecretsManagerClient;

  public constructor(region: string) {
    this.secretsManagerClient = new SecretsManagerClient({ region: region });
  }

  public async getSecret(
    secretName: string,
  ): Promise<SecretsConfig | string | undefined> {
    try {
      console.log(`Retrieving secret: ${secretName}`);
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const data: GetSecretValueCommandOutput =
        await this.secretsManagerClient.send(command);

      if (data.SecretString !== undefined) {
        return parseSecretsConfig(data.SecretString);
      } else if (data.SecretBinary) {
        return data.SecretBinary.toString();
      } else {
        console.warn(`Secret string or binary not found for: ${secretName}`);
        return undefined;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'ResourceNotFoundException') {
          console.error(`Secret ${secretName} was not found.`);
        } else if (error.name === 'InvalidRequestException') {
          console.error(`Invalid request to Secrets Manager: ${error.message}`);
        } else if (error.name === 'InvalidParameterException') {
          console.error(
            `Invalid parameter for secret ${secretName}: ${error.message}`,
          );
        } else {
          console.error(`Error retrieving secret ${secretName}:`, error);
        }
      }

      return undefined;
    }
  }
}

export interface SecretsConfig {
  bearerToken: string;
  clientId: string;
  userPoolId: string;
}
