import { FailedToFetchSecretError } from '../errors';

/**
 * Checks if the GetSecretValueCommandOutput contains a SecretString with a 'client_secret' property.
 * @param response The response object from AWS Secrets Manager.
 * @param secretString
 * @returns True if SecretString exists, is a string, contains 'client_secret', and parses as an object; otherwise, false.
 */
export function parseSecret(secretString: string | undefined): string {
  try {
    // prettier-ignore
    if (typeof secretString !== 'string') { // pragma: allowlist-secret
      throw new FailedToFetchSecretError('Secret is not correct type.');
    }
    if (!secretString.includes('client_secret')) {
      throw new FailedToFetchSecretError(
        'Secret does not contain client_secret',
      );
    }
    const secretStringParsed = JSON.parse(secretString) as unknown;

    // prettier-ignore
    if (typeof secretStringParsed !== 'object' || secretStringParsed === null) { // pragma: allowlist-secret
      throw new FailedToFetchSecretError('Secret format is incorrect');
    }

    const clientSecret = (secretStringParsed as { client_secret?: unknown })
      .client_secret;

    // prettier-ignore
    if (typeof clientSecret !== 'string') { // pragma: allowlist-secret
      throw new FailedToFetchSecretError('client_secret is not a string');
    }

    if (!clientSecret) {
      throw new FailedToFetchSecretError('client_secret is empty');
    }

    return clientSecret;
  } catch (error) {
    throw new FailedToFetchSecretError(String(error));
  }
}
