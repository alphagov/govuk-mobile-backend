import { FailedToFetchSecretError } from './errors';
import { logMessages } from './log-messages';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import zod, { ZodError } from 'zod/v4';
import { logger } from './logger';

const secretSchema = zod.object({
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  client_secret: zod.string().min(1),
});

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const sixtyMinutes = 60 * 60 * 1000; // maximum lifetime of a lambda container

export const getClientSecret = async (secretName: string): Promise<string> => {
  try {
    const secret = await getSecret(secretName, {
      maxAge: sixtyMinutes,
    });

    // prettier-ignore
    if (typeof secret !== 'string') { // pragma: allowlist-secret
      throw new FailedToFetchSecretError('Secret is not correct type.');
    }

    const secretStringParsed = JSON.parse(secret) as unknown;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { client_secret } = await secretSchema.parseAsync(secretStringParsed);

    logger.info(logMessages.SECRETS_FETCH_COMPLETE);

    return client_secret;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new FailedToFetchSecretError(zod.prettifyError(error));
    }
    throw new FailedToFetchSecretError(
      error instanceof Error ? error.message : String(error),
    );
  }
};
