import { describe, it, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";
import { AlarmTestCase } from "./alarm-test-case";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

const testCases: AlarmTestCase[] = [
  {
    name: "FederationThrottles",
    alarmName: "cognito-federation-throttles",
    actionsEnabled: true,
    alarmResource: "CloudWatchAlarmFederationThrottles",
    topicResource: "CloudWatchAlarmTopicPagerDuty",
    subscriptionResource: "CloudWatchAlarmTopicSubscriptionPagerDuty",
    topicPolicyResource: "CloudWatchAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "FederationThrottles",
    alarmDescription: "Alarm when federated requests exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/Cognito",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
      { Name: "IdentityProvider", Value: { Ref: "UserPoolIdentityProvider" } },
    ],
  },
  {
    name: "SignInThrottles",
    alarmName: "cognito-sign-in-throttles",
    actionsEnabled: true,
    alarmResource: "CloudWatchAlarmSignInThrottles",
    topicResource: "CloudWatchAlarmTopicPagerDuty",
    subscriptionResource: "CloudWatchAlarmTopicSubscriptionPagerDuty",
    topicPolicyResource: "CloudWatchAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "SignInThrottles",
    alarmDescription: "Alarm when the sign in rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/Cognito",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
    ],
  },
  {
    name: "SignUpThrottles",
    alarmName: "cognito-sign-up-throttles",
    actionsEnabled: true,
    alarmResource: "CloudWatchAlarmSignUpThrottles",
    topicResource: "CloudWatchAlarmTopicPagerDuty",
    subscriptionResource: "CloudWatchAlarmTopicSubscriptionPagerDuty",
    topicPolicyResource: "CloudWatchAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "SignUpThrottles",
    alarmDescription: "Alarm when the sign up rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/Cognito",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } }, //pragma: allowlist secret
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } }, //pragma: allowlist secret
    ], //pragma: allowlist secret
  },
  {
    name: "TokenRefreshThrottles",
    alarmName: "cognito-token-refresh-throttles",
    actionsEnabled: true,
    alarmResource: "CloudWatchAlarmTokenRefreshThrottles",
    topicResource: "CloudWatchAlarmTopicPagerDuty",
    subscriptionResource: "CloudWatchAlarmTopicSubscriptionPagerDuty",
    topicPolicyResource: "CloudWatchAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "TokenRefreshThrottles",
    alarmDescription: "Alarm when the token refresh rate exceeds 5 per minute",
    topicDisplayName: "cloudwatch-alarm-topic",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    namespace: "AWS/Cognito",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
    ],
  },
  {
    name: "CognitoWafThrottles",
    alarmName: "cognito-waf-error-rate",
    alarmResource: "CognitoWebApplicationFirewallAlarm",
    actionsEnabled: true,
    topicResource: "CloudWatchAlarmTopicPagerDuty",
    alarmDescription: "Alarm when the WAF error rate exceeds 5 per minute",
    metricName: "WAFErrorRate",
    topicDisplayName: "cloudwatch-alarm-topic",
    topicPolicyResource: "CloudWatchAlarmPublishToTopicPolicy",
    subscriptionResource: "CloudWatchAlarmTopicSubscriptionPagerDuty",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    statistic: "Sum",
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    namespace: "AWS/WAFV2",
    threshold: 5,
    comparisonOperator: "GreaterThanThreshold",
    dimensions: [
      { Name: "WebACL", Value: { Ref: "CognitoWebApplicationFirewall" } },
    ],
  }
];

describe.each(testCases)(
  "Set up CloudWatch Alarm for Cognito $name with supporting alarm resources",
  ({
    alarmName,
    actionsEnabled,
    alarmResource,
    topicResource,
    subscriptionResource,
    topicPolicyResource,
    slackChannelConfigurationResource,
    metricName,
    alarmDescription,
    topicDisplayName,
    namespace,
    dimensions,
    statistic,
    period,
    evaluationPeriods,
    datapointsToAlarm,
    threshold,
    comparisonOperator,
  }) => {
    const cloudWatchAlarmResources = template.findResources(
      "AWS::CloudWatch::Alarm"
    );
    const cloudWatchAlarmUnderTest = cloudWatchAlarmResources[
      alarmResource
    ] as any;

    const snsTopicResources = template.findResources("AWS::SNS::Topic");
    const snsTopicUnderTest = snsTopicResources[topicResource] as any;

    const subscriptionResources = template.findResources(
      "AWS::SNS::Subscription"
    );
    const subscriptionUnderTest = subscriptionResources[
      subscriptionResource
    ] as any;

    const topicPolicies = template.findResources("AWS::SNS::TopicPolicy");
    const topicPolicyUnderTest = topicPolicies[topicPolicyResource] as any;

    const slackChannelConfigurationResources = template.findResources(
      "AWS::Chatbot::SlackChannelConfiguration"
    );
    const slackChannelConfigurationUnderTest =
      slackChannelConfigurationResources[
      slackChannelConfigurationResource
      ] as any;

    const slackChannelIAMRole = template.findResources("AWS::IAM::Role");

    const slackChannelIAMRoleUnderTest = slackChannelIAMRole[
      "SlackSupportChannelConfigurationIAMRole"
    ] as any;

    it("should have a Slack Channel Configuration resource", () => {
      expect(slackChannelConfigurationUnderTest).toBeDefined();
      expect(slackChannelConfigurationUnderTest.Type).toEqual(
        "AWS::Chatbot::SlackChannelConfiguration"
      );
      expect(slackChannelConfigurationUnderTest.Properties).toBeDefined();
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackChannelId
      ).toEqual({
        "Fn::Sub":
          "{{resolve:ssm:/${ConfigStackName}/slack/out-of-hours-channel-id}}",
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackWorkspaceId
      ).toEqual({
        "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/slack/workspace-id}}",
      });
      expect(slackChannelConfigurationUnderTest.Properties.IamRoleArn).toEqual({
        "Fn::GetAtt": ["SlackSupportChannelConfigurationIAMRole", "Arn"],
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SnsTopicArns
      ).toEqual([
        {
          Ref: "CloudWatchAlarmTopicPagerDuty",
        },
      ]);
      expect(slackChannelConfigurationUnderTest.Properties.Tags).toEqual([
        { Key: "Product", Value: "GOV.UK" },
        { Key: "Environment", Value: { Ref: "Environment" } },
        { Key: "System", Value: "Authentication" },
      ]);
    });

    it("should have a Slack Channel IAM Role", () => {
      expect(slackChannelIAMRoleUnderTest).toBeDefined();
      expect(slackChannelIAMRoleUnderTest.Type).toEqual("AWS::IAM::Role");
      expect(slackChannelIAMRoleUnderTest.Properties).toBeDefined();
      expect(
        slackChannelIAMRoleUnderTest.Properties.PermissionsBoundary
      ).toEqual({
        "Fn::If": [
          "UsePermissionsBoundary",
          {
            Ref: "PermissionsBoundary",
          },
          {
            Ref: "AWS::NoValue",
          },
        ],
      });
      expect(
        slackChannelIAMRoleUnderTest.Properties.AssumeRolePolicyDocument
      ).toEqual({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "chatbot.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      });
      expect(slackChannelIAMRoleUnderTest.Properties.Tags).toEqual([
        { Key: "Product", Value: "GOV.UK" },
        { Key: "Environment", Value: { Ref: "Environment" } },
        { Key: "System", Value: "Authentication" },
      ]);
    });

    it(`should create a CloudWatch alarm for ${metricName}`, () => {
      expect(cloudWatchAlarmUnderTest).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Type).toEqual("AWS::CloudWatch::Alarm");
      expect(cloudWatchAlarmUnderTest.Properties).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Properties.AlarmName).toEqual({
        "Fn::Sub": "${AWS::StackName}-" + alarmName,
      });
      expect(cloudWatchAlarmUnderTest.Properties.ActionsEnabled).toEqual(
        actionsEnabled
      );
      expect(cloudWatchAlarmUnderTest.Properties.AlarmDescription).toEqual(
        alarmDescription
      );
      expect(cloudWatchAlarmUnderTest.Properties.MetricName).toEqual(
        metricName
      );
      expect(cloudWatchAlarmUnderTest.Properties.Namespace).toEqual(namespace);
      expect(cloudWatchAlarmUnderTest.Properties.Statistic).toEqual(statistic);
      expect(cloudWatchAlarmUnderTest.Properties.Period).toEqual(period);
      expect(cloudWatchAlarmUnderTest.Properties.DatapointsToAlarm).toEqual(
        datapointsToAlarm
      );
      expect(cloudWatchAlarmUnderTest.Properties.EvaluationPeriods).toEqual(evaluationPeriods);
      expect(cloudWatchAlarmUnderTest.Properties.Threshold).toEqual(threshold);
      expect(cloudWatchAlarmUnderTest.Properties.ComparisonOperator).toEqual(
        comparisonOperator
      );
      expect(cloudWatchAlarmUnderTest.Properties.Dimensions).toEqual(
        dimensions
      );
      expect(cloudWatchAlarmUnderTest.Properties.AlarmActions).toEqual([
        { Ref: topicResource },
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.OKActions).toEqual([
        { Ref: topicResource },
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.Tags).toEqual([
        { Key: "Product", Value: "GOV.UK" },
        { Key: "Environment", Value: { Ref: "Environment" } },
        { Key: "System", Value: "Authentication" },
      ]);
    });

    it(`should create a SNS topic for ${metricName}`, () => {
      expect(snsTopicUnderTest).toBeDefined();
      expect(snsTopicUnderTest.Type).toEqual("AWS::SNS::Topic");
      expect(snsTopicUnderTest.Properties).toBeDefined();
      expect(snsTopicUnderTest.Properties.DisplayName).toEqual({
        "Fn::Join": [
          "-",
          [
            { Ref: "AWS::StackName" },
            topicDisplayName,
            {
              "Fn::Select": [
                4,
                {
                  "Fn::Split": [
                    "-",
                    {
                      "Fn::Select": [
                        2,
                        {
                          "Fn::Split": ["/", { Ref: "AWS::StackId" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        ],
      });
      expect(snsTopicUnderTest.Properties.KmsMasterKeyId).toEqual({
        Ref: "CloudWatchAlarmNotificationTopicKey",
      });
      expect(snsTopicUnderTest.Properties.Tags).toEqual([
        { Key: "Product", Value: "GOV.UK" },
        { Key: "Environment", Value: { Ref: "Environment" } },
        { Key: "System", Value: "Authentication" },
      ]);
    });

    it(`should create a SNS subscription for ${metricName}`, () => {
      expect(subscriptionUnderTest).toBeDefined();
      expect(subscriptionUnderTest.Type).toEqual("AWS::SNS::Subscription");
      expect(subscriptionUnderTest.Properties).toBeDefined();
      expect(subscriptionUnderTest.Properties.Protocol).toEqual({
        "Fn::If": ["IsNotProduction", "lambda", "https"],
      });
      expect(subscriptionUnderTest.Properties.Endpoint).toEqual({
        "Fn::If": [
          "IsNotProduction",
          { "Fn::GetAtt": ["PagerDutyTestFunction", "Arn"] },
          {
            "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/pager-duty/url}}",
          },
        ],
      });
      expect(subscriptionUnderTest.Properties.TopicArn).toEqual({
        Ref: topicResource,
      });
    });

    it(`should create an SNS topic policy for ${metricName}`, () => {
      expect(topicPolicyUnderTest).toBeDefined();
      expect(topicPolicyUnderTest.Type).toEqual("AWS::SNS::TopicPolicy");
      expect(topicPolicyUnderTest.Properties).toBeDefined();
      expect(topicPolicyUnderTest.Properties.PolicyDocument).toEqual({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "cloudwatch.amazonaws.com" },
            Action: "sns:Publish",
            Resource: { Ref: topicResource },
            Condition: {
              ArnLike: {
                "AWS:SourceArn": {
                  "Fn::Sub":
                    "arn:aws:cloudwatch:${AWS::Region}:${AWS::AccountId}:alarm:*",
                },
              },
            },
          },
        ],
      });
    });

    it(`should create a Slack channel configuration for ${metricName}`, () => {
      expect(slackChannelConfigurationUnderTest).toBeDefined();
      expect(slackChannelConfigurationUnderTest.Type).toEqual(
        "AWS::Chatbot::SlackChannelConfiguration"
      );
      expect(slackChannelConfigurationUnderTest.Properties).toBeDefined();
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackChannelId
      ).toEqual({
        "Fn::Sub":
          "{{resolve:ssm:/${ConfigStackName}/slack/out-of-hours-channel-id}}",
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackWorkspaceId
      ).toEqual({
        "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/slack/workspace-id}}",
      });
      expect(slackChannelConfigurationUnderTest.Properties.IamRoleArn).toEqual({
        "Fn::GetAtt": ["SlackSupportChannelConfigurationIAMRole", "Arn"],
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SnsTopicArns
      ).toEqual([
        {
          Ref: "CloudWatchAlarmTopicPagerDuty",
        }
      ]);
    });
  }
);
