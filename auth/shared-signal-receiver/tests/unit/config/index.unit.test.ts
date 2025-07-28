import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getConfig } from '../../../config';

describe('Config', () => {
  describe('Given all config values are provided correctly', () => {
    let config;
    beforeAll(() => {
      process.env = {
        ...process.env,
        JWKS_URI: 'foo',
        SHARED_SIGNALS_AUDIENCE: 'foo',
        SHARED_SIGNALS_ISSUER: 'foo',
      };

      config = getConfig();
    });

    it('Returns a valid config object', () => {
      expect(config).toEqual({
        jwksUri: 'foo',
        audience: 'foo',
        issuer: 'foo',
      });
    });
  });

  describe('Given all config values are provided correctly', () => {
    const deleteEnvVar = (name: string) => {
      delete process.env[name];
    };
    const copy = { ...process.env };
    beforeAll(() => {
      deleteEnvVar('JWKS_URI');
      deleteEnvVar('SHARED_SIGNALS_AUDIENCE');
      deleteEnvVar('SHARED_SIGNALS_ISSUER');
    });

    afterAll(() => {
      process.env = copy;
    });

    it('Throws an exception', () => {
      expect(() => getConfig()).toThrowError();
    });
  });
});
