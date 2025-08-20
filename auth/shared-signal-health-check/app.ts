import type { ScheduledEvent } from 'aws-lambda';
import { HealthCheckClient } from './client/health-check-client';
import { initialiseHealthCheckService } from './init';
import { logMessages } from './log-messages';

const healthCheckService = initialiseHealthCheckService();

export const lambdaHandler = async (event: ScheduledEvent): Promise<void> => {
  console.info(logMessages.HEALTH_CHECK_START, {
    eventId: event.id,
  });

  const healthCheckClient = new HealthCheckClient(healthCheckService);
  await healthCheckClient.performHealthCheck();

  console.info(logMessages.HEALTH_CHECK_END, {
    eventId: event.id,
  });
};
