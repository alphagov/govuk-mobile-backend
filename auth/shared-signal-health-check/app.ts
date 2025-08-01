import type { ScheduledEvent } from 'aws-lambda';
import { HealthCheckClient } from './client/health-check-client';
import { initialiseHealthCheckService } from './init';
import { AuthError, ConfigError, VerifyError } from './errors';
import { logMessages } from './log-messages';

const healthCheckService = initialiseHealthCheckService();

export const lambdaHandler = async (event: ScheduledEvent): Promise<void> => {
  try {
    console.info(logMessages.HEALTH_CHECK_START, {
      eventId: event.id,
      eventTime: event.time,
    });

    const healthCheckClient = new HealthCheckClient(healthCheckService);
    await healthCheckClient.performHealthCheck();

    console.info(logMessages.HEALTH_CHECK_END, {
      eventId: event.id,
      eventTime: event.time,
    });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof ConfigError:
        console.error(logMessages.CONFIG_ERROR, error);
        break;
      case error instanceof AuthError:
        console.error(logMessages.AUTH_ERROR, error);
        break;
      case error instanceof VerifyError:
        console.error(logMessages.VERIFY_ERROR, error);
        break;
      default:
        console.error(logMessages.ERROR_UNHANDLED, error);
        break;
    }
  }
};
