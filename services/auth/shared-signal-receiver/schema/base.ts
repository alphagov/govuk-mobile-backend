import { z } from 'zod';

export const baseSignalEvent = z
  .object({
    aud: z.string(),
    iat: z.number(),
    iss: z.string(),
    jti: z.string(),
  })
  .strict();
