import {
  DescribeAlarmsCommand,
  DescribeAlarmsOutput,
} from "@aws-sdk/client-cloudwatch";
import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config";
import { AlarmTestCase } from "../acc/alarm-test-case";
import { TestLambdaDriver } from "../driver/testLambda.driver";

const driver = new TestLambdaDriver();

const testCases: AlarmTestCase[] = [
  {
    name: "4xx",
    alarmName: `${testConfig.stackName}-auth-proxy-4xx-errors`,
    actionsEnabled: true,
    metricName: "4XXError",
    alarmDescription: "Alarm detects a high rate of client-side errors.",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Average",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 0.05,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/ApiGateway",
    dimensions: [
      { Name: "ApiName", Value: testConfig.authProxyId },
      { Name: "Resource", Value: "/oauth2/token" },
      { Name: "Stage", Value: testConfig.deployedEnvironment },
      { Name: "Method", Value: "POST" },
    ],
  },
  {
    name: "5xx",
    alarmName: `${testConfig.stackName}-auth-proxy-5xx-errors`,
    actionsEnabled: true,
    metricName: "5XXError",
    alarmDescription: "Alarm detects a high rate of server-side errors.",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Average",
    period: 60,
    evaluationPeriods: 3,
    datapointsToAlarm: 3,
    threshold: 0.05,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/ApiGateway",
    dimensions: [{ Name: "ApiName", Value: testConfig.authProxyId }],
  },
  {
    name: "Latency",
    alarmName: `${testConfig.stackName}-auth-proxy-latency-errors`,
    actionsEnabled: true,
    metricName: "Latency",
    alarmDescription: "Alarm detects a high rate of latency errors.",
    topicDisplayName: "cloudwatch-alarm-topic",
    extendedStatistic: "p90",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 2500,
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    namespace: "AWS/ApiGateway",
    dimensions: [{ Name: "ApiName", Value: testConfig.authProxyId }],
  },
  {
    name: "Low200Response",
    alarmName: `${testConfig.stackName}-attestation-low-200-response-proportion`,
    actionsEnabled: false,
    topicDisplayName: "cloudwatch-alarm-topic",
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    alarmDescription: `A decrease has been detected in the proportion of 200 responses returned from the attestation endpoint,
based on the anomaly detection model.
See resolution steps in runbook:
https://gov-uk.atlassian.net/wiki/spaces/GOVUK/pages/4517658627/Runbook+High+number+of+attestation+failures`,
    dimensions: [],
    comparisonOperator: "LessThanLowerThreshold",
  },
  {
    name: "LowCompletion",
    alarmName: `${testConfig.stackName}-attestation-low-completion`,
    actionsEnabled: true,
    topicDisplayName: "cloudwatch-alarm-topic",
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 75,
    alarmDescription: `A large proportion of Attestation requests have not completed successfully.
See resolution steps in runbook:
https://gov-uk.atlassian.net/wiki/spaces/GOVUK/pages/4517658627/Runbook+High+number+of+attestation+failures
`,
    dimensions: [],
    comparisonOperator: "LessThanOrEqualToThreshold",
  },
  {
    name: "LambdaErrorRate",
    alarmName: `${testConfig.stackName}-attestation-lambda-error-rate`,
    actionsEnabled: true,
    topicDisplayName: "cloudwatch-alarm-topic",
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 10,
    alarmDescription: `Alarm for high number of attestation errors.
See resolution steps in runbook:
https://gov-uk.atlassian.net/wiki/spaces/GOVUK/pages/4517658627/Runbook+High+number+of+attestation+failures
`,
    dimensions: [],
    comparisonOperator: "GreaterThanOrEqualToThreshold",
  },
];

describe.each(testCases)(
  `CloudWatch Alarm for Cognito $alarmName with supporting alarm resources`,
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
      service: "CloudWatchClient",
      command: new DescribeAlarmsCommand({ AlarmNames: [alarmName] }),
      action: "DescribeAlarmsCommand",
    });
    const alarm = alarmResponse.MetricAlarms?.[0];

    if (!alarm) {
      throw new Error(`Alarm not found: ${alarmName}`);
    }
    it("should have the correct AlarmDescription", () => {
      assert.include(alarm.AlarmDescription, alarmDescription);
    });

    it("should have ActionsEnabled set to true", () => {
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

    it("should have OKActions and AlarmActions as arrays", () => {
      assert.isArray(alarm.OKActions);
      assert.isArray(alarm.AlarmActions);
    });

    it.skipIf(!dimensions)("should have Dimensions as an array", () => {
      assert.deepEqual(alarm.Dimensions, dimensions);
    });

    const alarmOKActions = alarm.OKActions;

    if (!alarmOKActions) {
      throw new Error(`No OKActions found for alarm: ${alarmName}`);
    }
  }
);
