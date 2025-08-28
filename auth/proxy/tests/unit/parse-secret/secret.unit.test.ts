import { describe, it, expect } from 'vitest';
import { parseSecret } from '../../../parse-secret';
import { FailedToFetchSecretError } from '../../../errors';

describe('parseSecret', () => {
  it('should parse a valid JSON secret string and return string value', () => {
    const secretString = JSON.stringify({
      client_secret: 'mock-val', // pragma: allowlist-secret
    });
    const result = parseSecret(secretString);
    expect(result).toEqual('mock-val');
  });

  it.each([
    [
      '{"client_secret": "user1", "password":}', // pragma: allowlist-secret
      `SyntaxError: Unexpected token '}', ..."password":}" is not valid JSON`,
    ], // pragma: allowlist-secret
    ['', `FailedToFetchSecretError: Secret does not contain client_secret`],
    [null, `FailedToFetchSecretError: Secret is not correct type.`],
    [undefined, `FailedToFetchSecretError: Secret is not correct type.`],
    [{}, `FailedToFetchSecretError: Secret is not correct type.`],
    [[], `FailedToFetchSecretError: Secret is not correct type.`],
    [
      JSON.stringify({
        client_secret: false,
      }),
      `FailedToFetchSecretError: client_secret is not a string`,
    ],
    [
      JSON.stringify({
        client_secret: '',
      }),
      `FailedToFetchSecretError: client_secret is empty`,
    ],
    [
      JSON.stringify('client_secret'),
      `FailedToFetchSecretError: Secret format is incorrect`,
    ],
  ])('should handle invalid inputs', (invalidSecret: any, message: string) => {
    expect(() => parseSecret(invalidSecret)).toThrow(
      new FailedToFetchSecretError(message),
    );
  });
});
