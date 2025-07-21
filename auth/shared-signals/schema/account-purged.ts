import { z } from "zod";

export const accountIdentifierSubjectClassSchema = z.object({
  format: z.string(),
  uri: z.string(),
});

export const accountPurgedClassSchema = z.object({
  subject: accountIdentifierSubjectClassSchema,
});

export const accountPurgedEventsClassSchema = z.object({
  "https://schemas.openid.net/secevent/risc/event-type/account-purged":
    accountPurgedClassSchema,
});

export const accountPurgedSchema = z.object({
  aud: z.string(),
  events: accountPurgedEventsClassSchema,
  iat: z.number(),
  iss: z.string(),
  jti: z.string(),
}).strict();
