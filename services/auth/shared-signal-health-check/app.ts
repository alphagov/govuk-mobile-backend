import { HealthCheckClient } from './client/health-check-client';
import { initialiseHealthCheckService } from './init';
import { logMessages } from './log-messages';
import { logger } from './logger';
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { errorMiddleware } from './middleware/global-error-handler';
import type { ScheduledEvent } from 'aws-lambda';
import { tracer } from './tracer';

const healthCheckService = initialiseHealthCheckService();

export const lambdaHandler = middy<ScheduledEvent>()
  .use(captureLambdaHandler(tracer))
  .use(
    injectLambdaContext(logger, {
      correlationIdPath: 'id',
    }),
  )
  .use(errorMiddleware())
  .handler(async (event: ScheduledEvent): Promise<void> => {
    logger.info(logMessages.HEALTH_CHECK_START, {
      eventId: event.id,
    });

    const healthCheckClient = new HealthCheckClient(healthCheckService);
    await healthCheckClient.performHealthCheck();

    logger.info(logMessages.HEALTH_CHECK_END, {
      eventId: event.id,
    });
  });
