import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  ChatbotClient,
  DescribeSlackChannelConfigurationsCommand,
} from "@aws-sdk/client-chatbot";
import { SNSClient, GetTopicAttributesCommand } from "@aws-sdk/client-sns";
import { assert, describe, it, expect } from "vitest";
import { testConfig } from "../common/config";
import { AlarmTestCase } from "./alarm-test-case";

const cloudWatchClient = new CloudWatchClient({ region: "eu-west-2" });
const snsClient = new SNSClient({ region: "eu-west-2" });
const chatbotClient = new ChatbotClient({ region: "us-east-2" });

const testCases: AlarmTestCase[] = [
  {
    name: "AuthWafThrottles",
    alarmName: `${testConfig.stackName}-auth-proxy-waf-rate-limit`,
    actionsEnabled: true,
    metricName: "BlockedRequests",
    alarmDescription: "Alarm when the Auth Proxy WAF rate limit exceeds 300 requests per 5 minutes",
    topicDisplayName: "cloudwatch-alarm-topic",
    extendedStatistic: undefined, // No extended statistic for WAF
    period: 300,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 300,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/WAFV2",
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
      const actualDimensions = alarm.Dimensions || [];
      const WebACL = actualDimensions.find((d) => d.Name === "WebACL");
      const region = actualDimensions.find((d) => d.Name === "Region");
      const rule = actualDimensions.find((d) => d.Name === "Rule");
      assert.equal(region?.Value, testConfig.region);
      assert.equal(WebACL?.Value, testConfig.authProxyWAF);
      assert.include(rule?.Value, "rate-limit-rule"); // WAF rules are dynamic, so we use a partial match
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
