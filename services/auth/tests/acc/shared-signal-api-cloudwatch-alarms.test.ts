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
    name: '4xx',
    alarmName: `${testConfig.stackName}-shared-signal-4xx-errors`,
    actionsEnabled: true,
    metricName: '4XXError',
    alarmDescription:
      'Shared Signal Alarm detects a high rate of client-side errors.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 0.05,
    comparisonOperator: 'GreaterThanThreshold',
    namespace: 'AWS/ApiGateway',
    dimensions: [
      { Name: 'ApiName', Value: `${testConfig.stackName}-shared-signal` },
      { Name: 'Stage', Value: testConfig.deployedEnvironment },
    ],
  },
  {
    name: '5xx',
    alarmName: `${testConfig.stackName}-shared-signal-5xx-errors`,
    actionsEnabled: true,
    metricName: '5XXError',
    alarmDescription:
      'Shared Signal Alarm detects a high rate of server-side errors.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 3,
    datapointsToAlarm: 3,
    threshold: 0.05,
    comparisonOperator: 'GreaterThanThreshold',
    namespace: 'AWS/ApiGateway',
    dimensions: [
      { Name: 'ApiName', Value: `${testConfig.stackName}-shared-signal` },
      { Name: 'Stage', Value: testConfig.deployedEnvironment },
    ],
  },
];

describe.each(testCases)(
  'CloudWatch Alarm for Shared Signal api gateway $alarmName with supporting alarm resources',
  async ({
    alarmName,
    actionsEnabled,
    metricName,
    alarmDescription,
    dimensions,
    statistic,
    extendedStatistic,
    period,
    evaluationPeriods,
    datapointsToAlarm,
    threshold,
    comparisonOperator,
    namespace,
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
