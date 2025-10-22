import {
  DescribeAlarmsCommand,
  DescribeAlarmsOutput,
} from '@aws-sdk/client-cloudwatch';
import { assert, describe, it } from 'vitest';
import { testConfig } from '../common/config';
import { AlarmTestCase } from '../types/alarm-test-case';
import { TestLambdaDriver } from '../../../../libs/test-utils/src/aws/testLambda.driver';

const driver = new TestLambdaDriver({
  region: testConfig.region,
  functionName: testConfig.testLambdaFunctionName,
});

const testCases: AlarmTestCase[] = [
  {
    name: 'SharedSignalAuthorizerConcurrency',
    alarmName: `${testConfig.stackName}-shared-signal-authorizer-concurrency`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'ConcurrentExecutions',
    alarmDescription:
      'Alarm when the Shared Signal Authorizer Lambda concurrency approaches the limit, triggers at 80% of the limit.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Maximum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 800,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-authorizer-function`,
      },
    ],
  },
  {
    name: 'SharedSignalAuthorizerThrottles',
    alarmName: `${testConfig.stackName}-shared-signal-authorizer-throttles`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'Throttles',
    alarmDescription:
      'Alarm when the Shared Signal Authorizer Lambda is being throttled.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-authorizer-function`,
      },
    ],
  },
  {
    name: 'SharedSignalAuthorizerTimeouts',
    alarmName: `${testConfig.stackName}-shared-signal-authorizer-timeout`,
    actionsEnabled: true,
    namespace: `${testConfig.stackName}/Timeouts`,
    metricName: 'SharedSignalAuthFunctionTimeout',
    alarmDescription:
      'Alarm when the Shared Signal Authorizer Lambda function is timing out.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-authorizer-function`,
      },
    ],
  },
  {
    name: 'SharedSignalReceiverConcurrency',
    alarmName: `${testConfig.stackName}-shared-signal-receiver-concurrency`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'ConcurrentExecutions',
    alarmDescription:
      'Alarm when the Shared Signal Receiver concurrency approaches the limit, triggers at 80% of the limit.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Maximum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 800,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-receiver`,
      },
    ],
  },
  {
    name: 'SharedSignalReceiverThrottles',
    alarmName: `${testConfig.stackName}-shared-signal-receiver-throttles`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'Throttles',
    alarmDescription:
      'Alarm when the Shared Signal Receiver Lambda is being throttled.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-receiver`,
      },
    ],
  },
  {
    name: 'SharedSignalReceiverTimeouts',
    alarmName: `${testConfig.stackName}-shared-signal-receiver-timeout`,
    actionsEnabled: true,
    namespace: `${testConfig.stackName}/Timeouts`,
    metricName: 'SharedSignalReceiverFunctionTimeout',
    alarmDescription:
      'Alarm when the Shared Signal Receiver Lambda function is timing out.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-shared-signal-receiver`,
      },
    ],
  },
  {
    name: 'RevokeRefreshTokenConcurrency',
    alarmName: `${testConfig.stackName}-revoke-refresh-token-concurrency`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'ConcurrentExecutions',
    alarmDescription:
      'Alarm when the Revoke Refresh Token Lambda concurrency approaches the limit, triggers at 80% of the limit.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Maximum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 800,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-revoke-refresh-token`,
      },
    ],
  },
  {
    name: 'RevokeRefreshTokenThrottles',
    alarmName: `${testConfig.stackName}-revoke-refresh-token-throttles`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    metricName: 'Throttles',
    alarmDescription:
      'Alarm when the Revoke Refresh Token Lambda is being throttled.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-revoke-refresh-token`,
      },
    ],
  },
  {
    name: 'RevokeRefreshTokenTimeouts',
    alarmName: `${testConfig.stackName}-revoke-refresh-token-timeout`,
    actionsEnabled: true,
    namespace: `${testConfig.stackName}/Timeouts`,
    metricName: 'RevokeRefreshTokenFunctionTimeout',
    alarmDescription:
      'Alarm when the Revoke Refresh Token Lambda function is timing out.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: `${testConfig.stackName}-revoke-refresh-token`,
      },
    ],
  },
];

describe.each(testCases)(
  `CloudWatch Alarm for Cognito $alarmName with supporting alarm resources`,
  async ({
    alarmName,
    actionsEnabled,
    metricName,
    namespace,
    alarmDescription,
    dimensions,
    statistic,
    extendedStatistic,
    period,
    evaluationPeriods,
    datapointsToAlarm,
    threshold,
    comparisonOperator,
  }) => {
    const alarmResponse = await driver.performAction<DescribeAlarmsOutput>({
      service: 'CloudWatchClient',
      command: new DescribeAlarmsCommand({ AlarmNames: [alarmName] }),
      action: 'DescribeAlarmsCommand',
    });
    const alarm = alarmResponse.MetricAlarms?.[0];

    if (!alarm) {
      throw new Error(`Alarm not found: ${alarmName}`);
    }
    it('should have the correct AlarmDescription', () => {
      assert.include(alarm.AlarmDescription, alarmDescription);
    });

    it('should have ActionsEnabled set to true', () => {
      assert.equal(alarm.ActionsEnabled, actionsEnabled);
    });

    it.skipIf(!metricName)(`should have MetricName as ${metricName}`, () => {
      assert.equal(alarm.MetricName, metricName);
    });

    it.skipIf(!namespace)("should have Namespace as 'AWS/ApiGateway'", () => {
      assert.equal(alarm.Namespace, namespace);
    });

    it(`should have Statistic as ${statistic}`, () => {
      assert.equal(alarm.Statistic, statistic);
    });

    it(`should have ExtendedStatistic as ${extendedStatistic}`, () => {
      assert.equal(alarm.ExtendedStatistic, extendedStatistic);
    });

    it.skipIf(!period)(`should have Period of ${period} seconds`, () => {
      assert.equal(alarm.Period, period);
    });

    it(`should have EvaluationPeriods of ${evaluationPeriods}`, () => {
      assert.equal(alarm.EvaluationPeriods, evaluationPeriods);
    });

    it(`should have DatapointsToAlarm of ${datapointsToAlarm}`, () => {
      assert.equal(alarm.DatapointsToAlarm, datapointsToAlarm);
    });

    it.skipIf(!threshold)(`should have Threshold of ${threshold}`, () => {
      assert.equal(alarm.Threshold, threshold);
    });

    it(`should have ComparisonOperator as ${comparisonOperator}`, () => {
      assert.equal(alarm.ComparisonOperator, comparisonOperator);
    });

    it('should have OKActions and AlarmActions as arrays', () => {
      assert.isArray(alarm.OKActions);
      assert.isArray(alarm.AlarmActions);
    });

    it.skipIf(!dimensions)('should have Dimensions as an array', () => {
      assert.deepEqual(alarm.Dimensions, dimensions);
    });

    const alarmOKActions = alarm.OKActions;

    if (!alarmOKActions) {
      throw new Error(`No OKActions found for alarm: ${alarmName}`);
    }
  },
);
