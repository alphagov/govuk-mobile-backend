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

const cloudWatchClient = new CloudWatchClient({ region: "eu-west-2" });
const snsClient = new SNSClient({ region: "eu-west-2" });
const chatbotClient = new ChatbotClient({ region: "us-east-2" });

type AlarmTestCase = {
  alarmName: string;
  actionsEnabled: boolean;
  metricName: string;
  alarmDescription: string;
  topicDisplayName: string;
  dimensions: any[];
};

const testCases: AlarmTestCase[] = [
  {
    alarmName: testConfig.CloudWatchAlarmFederationThrottlesName,
    actionsEnabled: true,
    metricName: "FederationThrottles",
    alarmDescription: "Alarm when federated requests exceeds 5 per minute",
    topicDisplayName: "cognito-federation-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
      { Name: "IdentityProvider", Value: "onelogin" },
    ],
  },
  {
    alarmName: testConfig.CloudWatchAlarmSignInThrottlesName,
    actionsEnabled: true,
    metricName: "SignInThrottles",
    alarmDescription: "Alarm when the sign in rate exceeds 5 per minute",
    topicDisplayName: "cognito-sign-in-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
  {
    alarmName: testConfig.CloudWatchAlarmSignUpThrottlesName,
    actionsEnabled: true,
    metricName: "SignUpThrottles",
    alarmDescription: "Alarm when the sign up rate exceeds 5 per minute",
    topicDisplayName: "cognito-sign-up-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
  {
    alarmName: testConfig.CloudWatchAlarmTokenRefreshThrottlesName,
    actionsEnabled: true,
    metricName: "TokenRefreshThrottles",
    alarmDescription: "Alarm when the token refresh rate exceeds 5 per minute",
    topicDisplayName: "cognito-token-refresh-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: testConfig.userPoolId },
      { Name: "UserPoolClient", Value: testConfig.clientId },
    ],
  },
];

describe.each(testCases)(
  `CloudWatch Alarm for Cognito $alarmName with supporting alarm resources`,
  async ({
    alarmName,
    alarmDescription,
    actionsEnabled,
    metricName,
    dimensions,
  }) => {
    const alarmResponse = await cloudWatchClient.send(
      new DescribeAlarmsCommand({ AlarmNames: [alarmName] })
    );
    const alarm = alarmResponse.MetricAlarms?.[0];

    if (!alarm) {
      throw new Error(`Alarm not found: ${alarmName}`);
    }
    it("should have the correct AlarmDescription", () => {
      assert.equal(alarm.AlarmDescription, alarmDescription);
    });

    it("should have ActionsEnabled set to true", () => {
      assert.equal(alarm.ActionsEnabled, actionsEnabled);
    });

    it(`should have MetricName as ${metricName}`, () => {
      assert.equal(alarm.MetricName, metricName);
    });

    it("should have Namespace as 'AWS/Cognito'", () => {
      assert.equal(alarm.Namespace, "AWS/Cognito");
    });

    it("should have Statistic as 'Sum'", () => {
      assert.equal(alarm.Statistic, "Sum");
    });

    it("should have Period of 60 seconds", () => {
      assert.equal(alarm.Period, 60);
    });

    it("should have EvaluationPeriods of 5", () => {
      assert.equal(alarm.EvaluationPeriods, 5);
    });

    it("should have DatapointsToAlarm of 5", () => {
      assert.equal(alarm.DatapointsToAlarm, 5);
    });

    it("should have Threshold of 5", () => {
      assert.equal(alarm.Threshold, 5);
    });

    it("should have ComparisonOperator as 'GreaterThanThreshold'", () => {
      assert.equal(alarm.ComparisonOperator, "GreaterThanThreshold");
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
        ChatConfigurationArn: testConfig.ChatConfigurationArn,
      })
    );
    const chatConfiguration =
      chatConfigurationResponse.SlackChannelConfigurations?.[0];
    if (!chatConfiguration) {
      throw new Error(
        `No SlackChannelConfigurations found for ARN: ${testConfig.ChatConfigurationArn}`
      );
    }

    it("should have the correct number of SnsTopicArns", () => {
      assert.equal(chatConfiguration.SnsTopicArns?.length, 4);
      chatConfiguration.SnsTopicArns?.forEach((arn) => {
        assert.include(arn, "CloudWatchAlarm");
      });
    });
  }
);
