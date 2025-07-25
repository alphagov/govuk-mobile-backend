/* eslint-disable @typescript-eslint/no-magic-numbers */
import { z, ZodError } from 'zod/v4';
import querystring from 'querystring';

const clientId = z
  .string()
  .min(1, { message: 'client_id is required' })
  .max(100, { message: 'client_id is too long' })
  .describe(
    'The client identifier issued to the client during the registration process',
  );

const authorizationCodeSchema = z.object({
  grant_type: z
    .literal('authorization_code')
    .describe('Must be "authorization_code" for this grant type'),
  client_id: clientId,
  redirect_uri: z
    .string()
    .min(1)
    .max(2000, { message: 'redirect_uri is too long' }),
  code: z
    .string()
    .min(8, { message: 'code is required and must be at least 8 characters' })
    .max(512, { message: 'code is too long' })
    .describe('The authorization code received from the authorization server'),
  code_verifier: z
    .string()
    .min(1)
    .max(128, { message: 'code_verifier must be at most 128 characters' })
    .describe('The PKCE code verifier used to obtain the authorization code'),
  scope: z
    .string()
    .min(1, { message: 'scope is required' })
    .max(1000, { message: 'scope is too long' })
    .describe('The scope of the access request, as a space-delimited string'),
});

// Define the schema for 'refresh_token' grant type
const refreshTokenSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().min(1, 'Refresh token is required'),
  client_id: clientId,
});

const grantUnionSchema = z.discriminatedUnion('grant_type', [
  authorizationCodeSchema,
  refreshTokenSchema,
]);

export type RequestBody = z.infer<typeof grantUnionSchema>;

export const validateRequestBodyOrThrow = async (
  body: unknown,
): Promise<RequestBody> => {
  if (body == null || body === '' || typeof body !== 'string') {
    throw new ZodError([
      {
        code: 'invalid_value',
        values: ['body'],
        path: ['body'],
        message: 'Invalid input: body is undefined',
        input: body,
      },
    ]);
  }

  const parsedBody = querystring.parse(body);
  return grantUnionSchema.parseAsync(parsedBody);
};
