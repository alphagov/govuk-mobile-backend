import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { getClientSecret } from '../../secret';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { FailedToFetchSecretError } from '../../errors';

vi.mock('@aws-lambda-powertools/parameters/secrets', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@aws-lambda-powertools/parameters/secrets')
  >();
  return {
    ...originalModule,
    getSecret: vi.fn().mockResolvedValue(
      JSON.stringify({
        client_secret: 'mock-client-secret', // pragma: allowlist-secret
      }),
    ),
  };
});

describe('secret', () => {
  const secretName = 'foo'; // pragma: allowlist-secret
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch client secret from AWS Secrets Manager', async () => {
    await expect(getClientSecret(secretName)).resolves.toEqual(
      'mock-client-secret',
    );
  });

  it('should use cached client secret', async () => {
    await getClientSecret(secretName);

    expect(getSecret).toHaveBeenCalledWith('foo', {
      maxAge: 60 * 60 * 1000,
    });
  });

  it('should throw error if secret is empty', async () => {
    (getSecret as Mock).mockResolvedValue(
      JSON.stringify({
        foo: 'bar',
      }),
    );

    await expect(getClientSecret(secretName)).rejects.toThrow(
      new FailedToFetchSecretError('client_secret is not a string'),
    );
  });

  it('should throw error if client_secret is empty', async () => {
    (getSecret as Mock).mockResolvedValue(
      JSON.stringify({
        client_secret: '',
      }),
    );

    await expect(getClientSecret(secretName)).rejects.toThrow(
      new FailedToFetchSecretError('client_secret is empty'),
    );
  });

  it('should wrap errors in a secrets error', async () => {
    (getSecret as Mock).mockRejectedValue(new Error('network error'));

    await expect(getClientSecret(secretName)).rejects.toThrow(
      FailedToFetchSecretError,
    );
  });

  it.each([
    [
      '{"client_secret": "user1", "password":}', // pragma: allowlist-secret
      `Unexpected token '}', ..."password":}" is not valid JSON`,
    ], // pragma: allowlist-secret
    ['', `Unexpected end of JSON input`],
    [null, `Secret is not correct type.`],
    [undefined, `Secret is not correct type.`],
    [{}, `Secret is not correct type.`],
    [[], `Secret is not correct type.`],
    [
      JSON.stringify({
        client_secret: false,
      }),
      `client_secret is not a string`,
    ],
    [
      JSON.stringify({
        client_secret: '',
      }),
      `client_secret is empty`,
    ],
  ])(
    'should handle invalid inputs',
    async (invalidSecret: any, message: string) => {
      (getSecret as Mock).mockResolvedValue(invalidSecret);
      await expect(getClientSecret(invalidSecret)).rejects.toThrow(
        new FailedToFetchSecretError(message),
      );
    },
  );
});
