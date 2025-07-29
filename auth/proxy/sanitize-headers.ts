import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { z } from 'zod/v4';

const maxHeaderValueLength = 1024; // adjust as appropriate

// eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
const asciiString = z
  .string()
  .regex(/^[\x00-\x7F]*$/, { message: 'Non-ASCII character found' });

const baseHeaderSchema = z.object({
  'content-type': z.enum([
    'application/x-www-form-urlencoded',
    'application/x-www-form-urlencoded; charset=UTF-8',
    'application/json',
    'application/json; charset=UTF-8',
  ]),
  accept: asciiString
    .max(maxHeaderValueLength)
    .optional()
    .describe("Client's preferred response format from Cognito."),
  'user-agent': asciiString
    .max(maxHeaderValueLength)
    .optional()
    .describe('Identifies the client or proxy software making the request.'),
  // 'host': asciiString.optional(),
  connection: z
    .enum([
      'keep-alive', // for persistent connections
      'close', // close connection after request
    ])
    .optional(),
});

const attestationEnabledSchema = baseHeaderSchema.extend({
  'x-attestation-token': asciiString,
});

export type SanitizedRequestHeaders = z.infer<typeof baseHeaderSchema>;
export type SanitizedRequestHeadersWithAttestation = z.infer<
  typeof attestationEnabledSchema
>;

export const sanitizeHeaders = async (
  headers: APIGatewayProxyEventHeaders,
  enableAttestation: boolean,
): Promise<
  SanitizedRequestHeaders | SanitizedRequestHeadersWithAttestation
> => {
  const headerSchema = enableAttestation
    ? attestationEnabledSchema
    : baseHeaderSchema;

  const normalizedHeaders = Object.entries(headers).reduce<
    Record<string, string>
  >((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {});

  return headerSchema.parseAsync(normalizedHeaders);
};
