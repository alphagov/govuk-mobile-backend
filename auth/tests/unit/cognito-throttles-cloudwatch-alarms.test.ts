import { describe, it, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import exp from "constants";

const template = loadTemplateFromFile("./template.yaml");

type AlarmTestCase = {
  name: string;
  alarmResource: string;
  topicResource: string;
  subscriptionResource: string;
  topicPolicyResource: string;
  slackChannelConfigurationResource: string;
  metricName: string;
  alarmDescription: string;
  topicDisplayName: string;
  dimensions: any[];
};

const testCases: AlarmTestCase[] = [
  {
    name: "FederationThrottles",
    alarmResource: "CloudWatchAlarmFederationThrottles",
    topicResource: "CloudWatchAlarmFederationThrottlesTopicPagerDuty",
    subscriptionResource:
      "CloudWatchAlarmFederationThrottlesTopicSubscriptionPagerDuty",
    topicPolicyResource:
      "CloudWatchAlarmFederationThrottlesAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "FederationThrottles",
    alarmDescription: "Alarm when federated requests exceeds 5 per minute",
    topicDisplayName: "cognito-federation-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
      { Name: "IdentityProvider", Value: { Ref: "UserPoolIdentityProvider" } },
    ],
  },
  {
    name: "SignInThrottles",
    alarmResource: "CloudWatchAlarmSignInThrottles",
    topicResource: "CloudWatchAlarmSignInThrottlesTopicPagerDuty",
    subscriptionResource:
      "CloudWatchAlarmSignInThrottlesTopicSubscriptionPagerDuty",
    topicPolicyResource:
      "CloudWatchAlarmSignInThrottlesAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "SignInThrottles",
    alarmDescription: "Alarm when the sign in rate exceeds 5 per minute",
    topicDisplayName: "cognito-sign-in-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
    ],
  },
  {
    name: "SignUpThrottles",
    alarmResource: "CloudWatchAlarmSignUpThrottles",
    topicResource: "CloudWatchAlarmSignUpThrottlesTopicPagerDuty",
    subscriptionResource:
      "CloudWatchAlarmSignUpThrottlesTopicSubscriptionPagerDuty",
    topicPolicyResource:
      "CloudWatchAlarmSignUpThrottlesAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "SignUpThrottles",
    alarmDescription: "Alarm when the sign up rate exceeds 5 per minute",
    topicDisplayName: "cognito-sign-up-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } }, //pragma: allowlist secret
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } }, //pragma: allowlist secret
    ], //pragma: allowlist secret
  },
  {
    name: "TokenRefreshThrottles",
    alarmResource: "CloudWatchAlarmTokenRefreshThrottles",
    topicResource: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
    subscriptionResource:
      "CloudWatchAlarmTokenRefreshThrottlesTopicSubscriptionPagerDuty", //pragma: allowlist secret
    topicPolicyResource:
      "CloudWatchAlarmTokenRefreshThrottlesAlarmPublishToTopicPolicy",
    slackChannelConfigurationResource: "SlackSupportChannelConfiguration",
    metricName: "TokenRefreshThrottles",
    alarmDescription: "Alarm when the token refresh rate exceeds 5 per minute",
    topicDisplayName: "cognito-token-refresh-alarm-topic",
    dimensions: [
      { Name: "UserPool", Value: { Ref: "CognitoUserPool" } },
      { Name: "UserPoolClient", Value: { Ref: "CognitoUserPoolClient" } },
    ],
  },
];

describe.each(testCases)(
  "Set up CloudWatch Alarm for Cognito $name with supporting alarm resources",
  ({
    alarmResource,
    topicResource,
    subscriptionResource,
    topicPolicyResource,
    slackChannelConfigurationResource,
    metricName,
    alarmDescription,
    topicDisplayName,
    dimensions,
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

    it(`should create a CloudWatch alarm for ${metricName}`, () => {
      expect(cloudWatchAlarmUnderTest).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Type).toEqual("AWS::CloudWatch::Alarm");
      expect(cloudWatchAlarmUnderTest.Properties).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Properties.AlarmDescription).toEqual(
        alarmDescription
      );
      expect(cloudWatchAlarmUnderTest.Properties.MetricName).toEqual(
        metricName
      );
      expect(cloudWatchAlarmUnderTest.Properties.Namespace).toEqual(
        "AWS/Cognito"
      );
      expect(cloudWatchAlarmUnderTest.Properties.Statistic).toEqual("Sum");
      expect(cloudWatchAlarmUnderTest.Properties.Period).toEqual(60);
      expect(cloudWatchAlarmUnderTest.Properties.EvaluationPeriods).toEqual(5);
      expect(cloudWatchAlarmUnderTest.Properties.Threshold).toEqual(5);
      expect(cloudWatchAlarmUnderTest.Properties.ComparisonOperator).toEqual(
        "GreaterThanThreshold"
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
        "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/slack/iam-role-arn}}",
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SnsTopicArns
      ).toEqual([
        {
          Ref: "CloudWatchAlarmSignUpThrottlesTopicPagerDuty",
        },
        {
          Ref: "CloudWatchAlarmSignInThrottlesTopicPagerDuty",
        },
        {
          Ref: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
        },
        {
          Ref: "CloudWatchAlarmFederationThrottlesTopicPagerDuty",
        },
      ]);
    });
  }
);
