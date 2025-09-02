/* eslint-disable @typescript-eslint/no-magic-numbers */
import { logMessages } from './log-messages';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import zod, { ZodError } from 'zod';
import { logger } from './logger';

const schema = zod.object({
  clientId: zod.string().min(1),
  clientSecret: zod.string().min(1),
  userPoolId: zod.string().min(1),
});

export type SecretsConfig = zod.infer<typeof schema>;

const sixtyMinutes = 60 * 60 * 1000; // maximum lifetime of a lambda container

export const getSecretObject = async (
  secretName: string,
): Promise<SecretsConfig> => {
  try {
    const secret = await getSecret(secretName, {
      maxAge: sixtyMinutes,
    });

    // prettier-ignore
    if (typeof secret !== 'string') { // pragma: allowlist-secret
      throw new Error('Secret is not correct type.');
    }

    const secretStringParsed = JSON.parse(secret) as unknown;

    const secretsObject = await schema.parseAsync(secretStringParsed);

    logger.info(logMessages.SECRETS_FETCH_COMPLETE);

    return secretsObject;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(zod.prettifyError(error));
    }
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
