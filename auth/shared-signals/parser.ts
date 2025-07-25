import { credentialChangeSchema } from './schema/credential-change';
import { accountPurgedSchema } from './schema/account-purged';
import { ZodError, z } from 'zod';

const unionSchema = z.union([credentialChangeSchema, accountPurgedSchema]);

export type RequestBody = z.infer<typeof unionSchema>;

export const parseRequest = (body: unknown): RequestBody => {
  try {
    return unionSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      console.error('Validation failed', e.errors);
      throw e;
    }
    throw new Error('Unexpected error during validation of request body');
  }
};
