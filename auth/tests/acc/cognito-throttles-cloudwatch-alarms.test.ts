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

const cloudWatchClient = new CloudWatchClient({ region: testConfig.region });
const snsClient = new SNSClient({ region: testConfig.region });
const chatbotClient = new ChatbotClient({
  region: 'eu-west-1' // only supported region
}); 

const testCases: AlarmTestCase[] = [
  {
    name: "FederationThrottles",
    alarmName: `${testConfig.stackName}-cognito-federation-throttles`,
    actionsEnabled: true,
    metricName: "FederationThrottles",
    alarmDescription: "Alarm when federated requests exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
      { Name: "IdentityProvider", Value: "onelogin" },
    ],
  },
  {
    name: "SignInThrottles",
    alarmName: `${testConfig.stackName}-cognito-sign-in-throttles`,
    actionsEnabled: true,
    metricName: "SignInThrottles",
    alarmDescription: "Alarm when the sign in rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
  {
    name: "SignUpThrottles",
    alarmName: `${testConfig.stackName}-cognito-sign-up-throttles`,
    actionsEnabled: true,
    metricName: "SignUpThrottles",
    alarmDescription: "Alarm when the sign up rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
  {
    name: "TokenRefreshThrottles",
    alarmName: `${testConfig.stackName}-cognito-token-refresh-throttles`,
    actionsEnabled: true,
    metricName: "TokenRefreshThrottles",
    alarmDescription: "Alarm when the token refresh rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
  {
    name: 'WAFRateLimitingAlarm',
    alarmName: `${testConfig.stackName}-cognito-waf-error-rate`,
    actionsEnabled: true,
    metricName: "WAFErrorRate",
    alarmDescription: "Alarm when the WAF error rate exceeds 5 incidents per minute",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "WebACL", Value: testConfig.cognitoWebApplicationFirewall },
    ],
    topicDisplayName: "cognito-waf-alarm-topic",
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
    period,
    evaluationPeriods,
    datapointsToAlarm,
    threshold,
    comparisonOperator,
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

    it("should have Namespace as 'AWS/Cognito'", () => {
      const expectedNamespace = ['AWS/Cognito', 'AWS/WAFV2'];
      assert.include(expectedNamespace, alarm.Namespace);
    });

    it(`should have Statistic as ${statistic}`, () => {
      assert.equal(alarm.Statistic, statistic);
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
