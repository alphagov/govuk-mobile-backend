import zod from 'zod/v4';

const schema = zod.object({
  jwksUri: zod.string(),
  audience: zod.string(),
  issuer: zod.string(),
});

export type Config = zod.infer<typeof schema>;

export const getConfig = (): Config => {
  return schema.parse({
    jwksUri: process.env['JWKS_URI'],
    audience: process.env['SHARED_SIGNALS_AUDIENCE'],
    issuer: process.env['SHARED_SIGNALS_ISSUER'],
  });
};
