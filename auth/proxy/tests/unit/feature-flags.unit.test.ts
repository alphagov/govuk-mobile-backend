import { beforeAll, describe, expect, it } from 'vitest';
import { FEATURE_FLAGS } from '../../feature-flags';

describe('feature-flags', () => {
  beforeAll(() => {
    process.env = {
      ...process.env,
      ENABLE_ATTESTATION: 'true',
    };
  });

  it('should contain an attestation feature flag', () => {
    expect(FEATURE_FLAGS.ATTESTATION).toBeDefined();
  });

  describe('attestation', () => {
    it('should resolve as a boolean', () => {
      expect(FEATURE_FLAGS.ATTESTATION).toBeTypeOf('boolean');
    });
  });
});
