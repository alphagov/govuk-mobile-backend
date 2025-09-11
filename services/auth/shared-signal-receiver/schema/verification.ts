import { z } from 'zod';
import { baseSignalEvent } from './base';

const signalEvents = z.object({
  'https://schemas.openid.net/secevent/sse/event-type/verification': z.object({
    state: z.string(),
  }),
});

export const signalVerificationSchema = baseSignalEvent.extend({
  events: signalEvents,
});

export type SignalVerificationEvent = z.infer<typeof signalVerificationSchema>;
