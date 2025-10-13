import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GenerateJwtPayload,
  generateKeysAndJwt,
} from './generate-keys-and-jwt';
import { isCryptoKey } from 'util/types';

describe('Generate Keys & JWT', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('01/01/2025'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('Returns a valid Public Key, Private Key, Public Kid & JWT', async () => {
    const jwtOptions: GenerateJwtPayload = {
      issuer: 'test',
      audience: ['test1', 'test2'],
      jti: '123456',
      payload: {
        test_claim: {
          foo: 'bar',
        },
      },
      alg: 'RS256',
      expiryDate: new Date('02/01/2025'),
      typ: 'JWT',
      kid: 'key-id',
    };

    const { privateKey, publicKey, publicKid, jwt } = await generateKeysAndJwt(
      jwtOptions,
    );

    expect(isCryptoKey(privateKey)).toBeTruthy();
    expect(isCryptoKey(publicKey)).toBeTruthy();
    expect(publicKid).toBeTypeOf('string');
    expect(jwt).toBeTypeOf('string');
  });
});
