import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SharedSignalsHealthCheckDriver } from '../driver/sharedSignalsHealthcheck.driver';
import { TestLambdaDriver } from '../driver/testLambda.driver';
import { testConfig } from '../common/config';
import { LoggingDriver } from '../driver/logging.driver';

describe('Shared Signals Health-check', () => {
  const testLambdaDirver = new TestLambdaDriver();
  const healthCheckScenario = new SharedSignalsHealthCheckDriver(
    testLambdaDirver,
    testConfig.sharedSignalHealthCheckFunctionName,
  );
  const loggingDriver = new LoggingDriver(testLambdaDirver);

  describe('Given a connection between the Receiver and Transmitter', () => {
    describe('When the health-check is triggered', () => {
      const startTime = Date.now() - 1000 * 60 * 2; // 5 minutes ago

      beforeAll(async () => {
        await healthCheckScenario.triggerHealthCheck();
      });

      it('Should return a confirmation log', async () => {
        const response = await loggingDriver.findLogMessageWithRetries({
          logGroupName: testConfig.authProxyLogGroup,
          searchString: 'HEALTH_CHECK_END',
          startTime,
          delayMs: 3000,
        });

        expect(response).toBeDefined();
      });

      it('And a verification state');
    });
  });

  describe('Given the health-check receives a success response', () => {});
});
