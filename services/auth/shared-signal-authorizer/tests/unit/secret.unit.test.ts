import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { getSecretObject } from '../../secret';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

vi.mock('@aws-lambda-powertools/parameters/secrets', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@aws-lambda-powertools/parameters/secrets')
  >();
  return {
    ...originalModule,
    getSecret: vi.fn().mockResolvedValue(
      JSON.stringify({
        clientId: 'foo',
        clientSecret: 'mock-client-secret', // pragma: allowlist-secret
        userPoolId: 'bar',
      }),
    ),
  };
});

describe('secret', () => {
  const secretName = 'foo'; // pragma: allowlist-secret
  const generateMockSecret = (overrides?: any) => ({
    clientId: 'foo',
    clientSecret: 'mock-client-secret', // pragma: allowlist-secret
    userPoolId: 'bar',
    ...overrides,
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch client secret from AWS Secrets Manager', async () => {
    await expect(getSecretObject(secretName)).resolves.toEqual(
      generateMockSecret(),
    );
  });

  it('should use cached client secret', async () => {
    await getSecretObject(secretName);

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

    await expect(getSecretObject(secretName)).rejects.toThrow(
      new Error(`✖ Invalid input: expected string, received undefined
  → at clientId
✖ Invalid input: expected string, received undefined
  → at clientSecret
✖ Invalid input: expected string, received undefined
  → at userPoolId`),
    );
  });

  it('should wrap errors in a secrets error', async () => {
    (getSecret as Mock).mockRejectedValue(new Error('network error'));

    await expect(getSecretObject(secretName)).rejects.toThrow(Error);
  });

  it.each([
    ['', `Unexpected end of JSON input`],
    [null, `Secret is not correct type.`],
    [undefined, `Secret is not correct type.`],
    [{}, `Secret is not correct type.`],
    [[], `Secret is not correct type.`],
    [
      JSON.stringify(
        generateMockSecret({
          clientSecret: false,
        }),
      ),
      `✖ Invalid input: expected string, received boolean
  → at clientSecret`,
    ],
    [
      JSON.stringify(
        generateMockSecret({
          clientId: false,
        }),
      ),
      `✖ Invalid input: expected string, received boolean
  → at clientId`,
    ],
  ])(
    'should handle invalid inputs',
    async (invalidSecret: any, message: string) => {
      (getSecret as Mock).mockResolvedValue(invalidSecret);
      await expect(getSecretObject(invalidSecret)).rejects.toThrow(
        new Error(message),
      );
    },
  );
});
