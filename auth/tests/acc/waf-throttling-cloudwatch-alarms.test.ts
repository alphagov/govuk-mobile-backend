import {
  DescribeAlarmsCommand,
  DescribeAlarmsOutput,
} from '@aws-sdk/client-cloudwatch';
import { assert, describe, it } from 'vitest';
import { testConfig } from '../common/config';
import { AlarmTestCase } from '../types/alarm-test-case';
import { TestLambdaDriver } from '../driver/testLambda.driver';

const driver = new TestLambdaDriver();

const testCases: AlarmTestCase[] = [
  {
    name: 'AuthWafThrottles',
    alarmName: `${testConfig.stackName}-auth-proxy-waf-rate-limit`,
    actionsEnabled: true,
    metricName: 'BlockedRequests',
    alarmDescription:
      'Alarm when the Auth Proxy WAF rate limit exceeds 300 requests per 5 minutes',
    topicDisplayName: 'cloudwatch-alarm-topic',
    extendedStatistic: undefined, // No extended statistic for WAF
    period: 300,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 300,
    comparisonOperator: 'GreaterThanThreshold',
    namespace: 'AWS/WAFV2',
    statistic: 'Sum', // WAF metrics typically use Sum
    dimensions: [
      { Name: 'WebACL', Value: testConfig.authProxyWAF.split('|')[0] }, // Extract the WAF ID (format: "<waf-id>|<uuid>|<scope>")
      { Name: 'Region', Value: testConfig.region },
      { Name: 'Rule', Value: 'rate-limit-rule' }, // Assuming a rule name for rate limiting
    ],
  },
  {
    name: 'WAFRateLimitingAlarm',
    alarmName: `${testConfig.stackName}-cognito-waf-error-rate`,
    actionsEnabled: true,
    metricName: 'WAFErrorRate',
    alarmDescription:
      'Alarm when the WAF error rate exceeds 5 incidents per minute',
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    namespace: 'AWS/WAFV2',
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: [
      {
        Name: 'WebACL',
        Value: testConfig.cognitoWebApplicationFirewall.split('|')[0],
      }, // Extract the WAF ID (format: "<waf-id>|<uuid>|<scope>")
      { Name: 'Region', Value: testConfig.region },
      { Name: 'Rule', Value: 'cognito-waf-rate-limit-rule' }, // Assuming a rule name for rate limiting
    ],
    topicDisplayName: 'cognito-waf-alarm-topic',
  },
];

describe.each(testCases)(
  `CloudWatch Alarm for Cognito $alarmName with supporting alarm resources`,
  async ({
    alarmName,
    actionsEnabled,
    metricName,
    alarmDescription,
    statistic,
    extendedStatistic,
    period,
    evaluationPeriods,
    datapointsToAlarm,
    dimensions,
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

    it(`should have MetricName as ${metricName}`, () => {
      assert.equal(alarm.MetricName, metricName);
    });

    it("should have Namespace as 'AWS/ApiGateway'", () => {
      assert.equal(alarm.Namespace, namespace);
    });

    it(`should have Statistic as ${statistic}`, () => {
      assert.equal(alarm.Statistic, statistic);
    });

    it(`should have ExtendedStatistic as ${extendedStatistic}`, () => {
      assert.equal(alarm.ExtendedStatistic, extendedStatistic);
    });

    it(`should have Period of ${period} seconds`, () => {
      assert.equal(alarm.Period, period);
    });

    it(`should have EvaluationPeriods of ${evaluationPeriods}`, () => {
      assert.equal(alarm.EvaluationPeriods, evaluationPeriods);
    });

    it(`should have DatapointsToAlarm of ${datapointsToAlarm}`, () => {
      assert.equal(alarm.DatapointsToAlarm, datapointsToAlarm);
    });

    it(`should have Threshold of ${threshold}`, () => {
      assert.equal(alarm.Threshold, threshold);
    });

    it(`should have ComparisonOperator as ${comparisonOperator}`, () => {
      assert.equal(alarm.ComparisonOperator, comparisonOperator);
    });

    it('should have OKActions and AlarmActions as arrays', () => {
      assert.isArray(alarm.OKActions);
      assert.isArray(alarm.AlarmActions);
    });

    it('should have Dimensions as an array', () => {
      const actualDimensions = alarm.Dimensions || [];
      const WebACL = actualDimensions.find((d) => d.Name === 'WebACL');
      const region = actualDimensions.find((d) => d.Name === 'Region');
      const rule = actualDimensions.find((d) => d.Name === 'Rule');

      assert.equal(region?.Value, dimensions[1].Value);
      assert.equal(WebACL?.Value, dimensions[0].Value); // WAF ID
      assert.include(rule?.Value, dimensions[2].Value); // WAF rules are dynamic, so we use a partial match
    });

    const alarmOKActions = alarm.OKActions;

    if (!alarmOKActions) {
      throw new Error(`No OKActions found for alarm: ${alarmName}`);
    }
  },
);
