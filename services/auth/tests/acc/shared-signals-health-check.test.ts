import { beforeAll, describe, expect, it } from 'vitest';
import { SharedSignalsHealthCheckDriver } from '../driver/sharedSignalsHealthcheck.driver';
import { TestLambdaDriver } from '../../../../libs/test-utils/src/aws/testLambda.driver';
import { testConfig } from '../common/config';
import { LoggingDriver } from '../../../../libs/test-utils/src/aws/logging.driver';

describe('Shared Signals Health-check', () => {
  const testLambdaDirver = new TestLambdaDriver({
    region: testConfig.region,
    functionName: testConfig.testLambdaFunctionName,
  });
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
          logGroupName: testConfig.sharedSignalHealthCheckFunctionLogGroupName,
          searchString: 'HEALTH_CHECK_END',
          startTime,
          delayMs: 5000,
        });

        expect(response).toBeDefined();
      });

      it('Should log the verification result', async () => {
        const response = await loggingDriver.findLogMessageWithRetries({
          logGroupName: testConfig.sharedSignalHealthCheckFunctionLogGroupName,
          searchString: 'Token verification successful',
          startTime,
          delayMs: 5000,
        });

        expect(response).toBeDefined();
      });
    });
  });
});
