import { z } from 'zod';

export const credentialTypeEnumSchema = z.union([
  z.literal('email'),
  z.literal('password'),
]);

export const accountIdentifierSubjectClassSchema = z.object({
  format: z.string(),
  uri: z.string(),
});

export const credentialChangeInformationClassSchema = z.object({
  email: z.string().optional().nullable(),
});

export const credentialChangeClassSchema = z.object({
  change_type: z.enum(['update', 'delete', 'create', 'revoke']),
  credential_type: credentialTypeEnumSchema.optional(),
  subject: accountIdentifierSubjectClassSchema,
});

export const credentialChangeEventsClassSchema = z.object({
  'https://schemas.openid.net/secevent/caep/event-type/credential-change':
    credentialChangeClassSchema,
  'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
    credentialChangeInformationClassSchema.optional().nullable(),
});

export const credentialChangeSchema = z
  .object({
    aud: z.string(),
    events: credentialChangeEventsClassSchema,
    iat: z.number(),
    iss: z.string(),
    jti: z.string(),
  })
  .strict();
