import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { testConfig } from './config';

const client = new SecretsManagerClient({ region: testConfig.region });

export const getClientSecret = async (secretName: string): Promise<string> => {
  if (!secretName) {
    throw new Error('Secret name is not provided');
  }

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (response.SecretString == null) {
    throw new Error('Secret string is empty');
  }

  return response.SecretString;
};
