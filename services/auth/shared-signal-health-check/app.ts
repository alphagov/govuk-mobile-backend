import type { Context, ScheduledEvent } from 'aws-lambda';
import { HealthCheckClient } from './client/health-check-client';
import { initialiseHealthCheckService } from './init';
import { logMessages } from './log-messages';
import { logger } from './logger';

const healthCheckService = initialiseHealthCheckService();

export const lambdaHandler = async (
  event: ScheduledEvent,
  context: Context,
): Promise<void> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);

  logger.info(logMessages.HEALTH_CHECK_START, {
    eventId: event.id,
  });

  const healthCheckClient = new HealthCheckClient(healthCheckService);
  await healthCheckClient.performHealthCheck();

  logger.info(logMessages.HEALTH_CHECK_END, {
    eventId: event.id,
  });
};
