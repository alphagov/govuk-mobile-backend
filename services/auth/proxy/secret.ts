import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { FailedToFetchSecretError } from './errors';
import { parseSecret } from './parse-secret';

let cachedClientSecret: string | null = null;

export const getClientSecret = async (
  client: SecretsManagerClient = new SecretsManagerClient({
    region: 'eu-west-2',
  }),
  cachedClientSecretOverride: string | null = cachedClientSecret,
): Promise<string> => {
  if (cachedClientSecretOverride != null) {
    console.log('Using cached client secret');
    return cachedClientSecretOverride;
  }
  const secretName = process.env['COGNITO_SECRET_NAME'];

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!secretName) {
    throw new FailedToFetchSecretError('Secret name is not provided');
  }

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  cachedClientSecret = parseSecret(response.SecretString);

  console.log('Fetched client secret');

  return cachedClientSecret;
};
