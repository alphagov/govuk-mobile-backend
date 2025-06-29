import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  ChatbotClient,
  DescribeSlackChannelConfigurationsCommand,
} from "@aws-sdk/client-chatbot";
import { SNSClient, GetTopicAttributesCommand } from "@aws-sdk/client-sns";
import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config";
import { AlarmTestCase } from "../acc/alarm-test-case";

const cloudWatchClient = new CloudWatchClient({ region: "eu-west-2" });
const snsClient = new SNSClient({ region: "eu-west-2" });
const chatbotClient = new ChatbotClient({ region: "us-east-2" });

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
      { Name: "Stage", Value: testConfig.testEnvironment },
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
    name: "AuthWafThrottles",
    alarmName: `${testConfig.stackName}-auth-proxy-waf-rate-limit`,
    actionsEnabled: true,
    metricName: "AuthWAFErrorRate",
    alarmDescription: "Alarm when the Auth Proxy WAF rate limit exceeds 300 requests per 5 minutes",
    topicDisplayName: "cloudwatch-alarm-topic",
    extendedStatistic: undefined, // No extended statistic for WAF
    period: 300,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 300,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/WAFV2",
    dimensions: [{ Name: "WebACL", Value: testConfig.authProxyWAF }],
    statistic: "Sum", // WAF metrics typically use Sum
  }
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
    namespace
  }) => {
    const alarmResponse = await cloudWatchClient.send(
      new DescribeAlarmsCommand({ AlarmNames: [alarmName] })
    );
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

    it("should have OKActions and AlarmActions as arrays", () => {
      assert.isArray(alarm.OKActions);
      assert.isArray(alarm.AlarmActions);
    });

    it("should have Dimensions as an array", () => {
      assert.deepEqual(alarm.Dimensions, dimensions);
    });

    const alarmOKActions = alarm.OKActions;

    if (!alarmOKActions) {
      throw new Error(`No OKActions found for alarm: ${alarmName}`);
    }

    alarmOKActions?.forEach(async (action) => {
      const topic = await snsClient.send(
        new GetTopicAttributesCommand({ TopicArn: action })
      );
      const topicAttributes = topic.Attributes;
      it("$action topic should be encrypted", () => {
        assert.isNotEmpty(topicAttributes?.KmsMasterKeyId);
      });
    });

    const alarmAlarmActions = alarm.AlarmActions;

    if (!alarmAlarmActions) {
      throw new Error(`No AlarmActions found for alarm: ${alarmName}`);
    }

    alarmAlarmActions?.forEach(async (action) => {
      const topic = await snsClient.send(
        new GetTopicAttributesCommand({ TopicArn: action })
      );
      const topicAttributes = topic.Attributes;
      it("$action topic should be encrypted", () => {
        assert.isNotEmpty(topicAttributes?.KmsMasterKeyId);
      });
    });

    const chatConfigurationResponse = await chatbotClient.send(
      new DescribeSlackChannelConfigurationsCommand({
        ChatConfigurationArn: testConfig.chatConfigurationArn,
      })
    );
    const chatConfiguration =
      chatConfigurationResponse.SlackChannelConfigurations?.[0];
    if (!chatConfiguration) {
      throw new Error(
        `No SlackChannelConfigurations found for ARN: ${testConfig.chatConfigurationArn}`
      );
    }

    it("should have the correct number of SnsTopicArns", () => {
      assert.equal(chatConfiguration.SnsTopicArns?.length, 1);
      chatConfiguration.SnsTopicArns?.forEach((arn) => {
        assert.include(arn, "CloudWatchAlarm");
      });
    });
  }
);
