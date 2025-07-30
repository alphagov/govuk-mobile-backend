import { ConfigError } from './errors';
import { SharedSignalsHealthCheckService } from './service/health-check-service';

export const initialiseHealthCheckService =
  (): SharedSignalsHealthCheckService => {
    const healthCheckTokenUrl = process.env['HEALTH_CHECK_TOKEN_URL'];
    if (
      healthCheckTokenUrl === undefined ||
      healthCheckTokenUrl === 'undefined'
    ) {
      throw new ConfigError(
        'HEALTH_CHECK_TOKEN_URL environment variable is not set',
      );
    }

    const healthCheckVerifyUrl = process.env['HEALTH_CHECK_VERIFY_URL'];
    if (
      healthCheckVerifyUrl === undefined ||
      healthCheckVerifyUrl === 'undefined'
    ) {
      throw new ConfigError(
        'HEALTH_CHECK_VERIFY_URL environment variable is not set',
      );
    }

    const healthCheckSecretName = process.env['HEALTH_CHECK_SECRET_NAME'];
    if (
      healthCheckSecretName === undefined || //pragma: allowlist secret
      healthCheckSecretName === 'undefined' //pragma: allowlist secret
    ) {
      throw new ConfigError(
        'HEALTH_CHECK_SECRET_NAME environment variable is not set',
      );
    }

    return new SharedSignalsHealthCheckService(
      healthCheckTokenUrl,
      healthCheckVerifyUrl,
      healthCheckSecretName,
    );
  };
