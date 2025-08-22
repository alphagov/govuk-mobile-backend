import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { initialiseHealthCheckService } from '../../init';
import { ConfigError } from '../../errors';
import { SharedSignalHealthCheckService } from '../../service/health-check-service';

const ENV_VARS = {
  HEALTH_CHECK_TOKEN_URL: 'https://token.url',
  HEALTH_CHECK_VERIFY_URL: 'https://verify.url',
  HEALTH_CHECK_SECRET_NAME: 'secret-name', // pragma: allowlist secret
};

function setEnv(vars: Partial<typeof ENV_VARS>) {
  for (const key of Object.keys(ENV_VARS)) {
    process.env[key] = vars[key as keyof typeof ENV_VARS] ?? undefined;
  }
}

describe('initialiseHealthCheckService', () => {
  beforeEach(() => {
    setEnv(ENV_VARS);
  });

  afterEach(() => {
    setEnv({});
  });

  it('should initialise SharedSignalHealthCheckService with correct env vars', () => {
    const service = initialiseHealthCheckService();
    expect(service).toBeInstanceOf(SharedSignalHealthCheckService);
    expect((service as any).healthCheckTokenUrl).toBe(
      ENV_VARS.HEALTH_CHECK_TOKEN_URL,
    );
    expect((service as any).healthCheckVerifyUrl).toBe(
      ENV_VARS.HEALTH_CHECK_VERIFY_URL,
    );
    expect((service as any).healthCheckSecretName).toBe(
      ENV_VARS.HEALTH_CHECK_SECRET_NAME,
    );
  });

  it.each([
    [
      'HEALTH_CHECK_TOKEN_URL',
      'HEALTH_CHECK_TOKEN_URL environment variable is not set',
    ],
    [
      'HEALTH_CHECK_VERIFY_URL',
      'HEALTH_CHECK_VERIFY_URL environment variable is not set',
    ],
    [
      'HEALTH_CHECK_SECRET_NAME',
      'HEALTH_CHECK_SECRET_NAME environment variable is not set',
    ],
  ])('should throw ConfigError if %s is missing', (missingKey, expectedMsg) => {
    setEnv({ ...ENV_VARS, [missingKey]: undefined });
    expect(() => initialiseHealthCheckService()).toThrow(
      new ConfigError(expectedMsg),
    );
  });
});
