import { describe, it, beforeAll, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";

const template = loadTemplateFromFile("./template.yaml");

describe("Set up CloudWatch Alarm for Cognito TokenRefreshThrottles with supporting alarm resources", () => {
  const cloudWatchAlarmResources = template.findResources(
    "AWS::CloudWatch::Alarm"
  );
  const cloudWatchAlarmUnderTest = cloudWatchAlarmResources[
    "CloudWatchAlarmTokenRefreshThrottles"
  ] as any;

  const snsTopicResources = template.findResources("AWS::SNS::Topic");
  const snsTopicUnderTest = snsTopicResources[
    "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty"
  ] as any;

  const subscriptionResources = template.findResources(
    "AWS::SNS::Subscription"
  );
  const subscriptionUnderTest = subscriptionResources[
    "CloudWatchAlarmTokenRefreshThrottlesTopicSubscriptionPagerDuty" // pragma: allowlist secret
  ] as any;

  const topicPolicies = template.findResources("AWS::SNS::TopicPolicy");
  const topicPolicyUnderTest = topicPolicies[
    "CloudWatchAlarmTokenRefreshThrottlesAlarmPublishToTopicPolicy"
  ] as any;

  it("should create a CloudWatch alarm for TokenRefreshThrottles", () => {
    expect(cloudWatchAlarmUnderTest).toBeDefined();
    expect(cloudWatchAlarmUnderTest.Type).toEqual("AWS::CloudWatch::Alarm");
    expect(cloudWatchAlarmUnderTest.Properties).toBeDefined();
    expect(cloudWatchAlarmUnderTest.Properties.AlarmDescription).toEqual(
      "Alarm when the token refresh rate exceeds 5 per minute"
    );
    expect(cloudWatchAlarmUnderTest.Properties.MetricName).toEqual(
      "TokenRefreshThrottles"
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
    expect(cloudWatchAlarmUnderTest.Properties.Dimensions).toEqual([
      {
        Name: "UserPool",
        Value: {
          Ref: "CognitoUserPool",
        },
      },
      {
        Name: "UserPoolClient",
        Value: {
          Ref: "CognitoUserPoolClient",
        },
      },
    ]);
    expect(cloudWatchAlarmUnderTest.Properties.AlarmActions).toEqual([
      {
        Ref: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
      },
    ]);
    expect(cloudWatchAlarmUnderTest.Properties.OKActions).toEqual([
      {
        Ref: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
      },
    ]);

    expect(cloudWatchAlarmUnderTest.Properties.Tags).toEqual([
      {
        Key: "Product",
        Value: "GOV.UK",
      },
      {
        Key: "Environment",
        Value: {
          Ref: "Environment",
        },
      },
      {
        Key: "System",
        Value: "Authentication",
      },
    ]);
  });
  it("should create a SNS topic for TokenRefreshThrottles", () => {
    expect(snsTopicUnderTest).toBeDefined();
    expect(snsTopicUnderTest.Type).toEqual("AWS::SNS::Topic");
    expect(snsTopicUnderTest.Properties).toBeDefined();
    expect(snsTopicUnderTest.Properties.DisplayName).toEqual({
      "Fn::Join": [
        "-",
        [
          {
            Ref: "AWS::StackName",
          },
          "cognito-token-refresh-alarm-topic",
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
                        "Fn::Split": [
                          "/",
                          {
                            Ref: "AWS::StackId",
                          },
                        ],
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
      {
        Key: "Product",
        Value: "GOV.UK",
      },
      {
        Key: "Environment",
        Value: {
          Ref: "Environment",
        },
      },
      {
        Key: "System",
        Value: "Authentication",
      },
    ]);
  });
  it("should create a SNS subscription for TokenRefreshThrottles", () => {
    expect(subscriptionUnderTest).toBeDefined();
    expect(subscriptionUnderTest.Type).toEqual("AWS::SNS::Subscription");
    expect(subscriptionUnderTest.Properties).toBeDefined();
    expect(subscriptionUnderTest.Properties.Protocol).toEqual({
      "Fn::If": ["IsNotProduction", "lambda", "https"],
    });
    expect(subscriptionUnderTest.Properties.Endpoint).toEqual({
      "Fn::If": [
        "IsNotProduction",
        {
          "Fn::GetAtt": ["PagerDutyTestFunction", "Arn"],
        },
        "{{resolve:ssm:/pager-duty/url}}",
      ],
    });
    expect(subscriptionUnderTest.Properties.TopicArn).toEqual({
      Ref: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
    });
  });
  it("should create an SNS topic policy for TokenRefreshThrottles", () => {
    expect(topicPolicyUnderTest).toBeDefined();
    expect(topicPolicyUnderTest.Type).toEqual("AWS::SNS::TopicPolicy");
    expect(topicPolicyUnderTest.Properties).toBeDefined();
    expect(topicPolicyUnderTest.Properties.PolicyDocument).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "cloudwatch.amazonaws.com",
          },
          Action: "sns:Publish",
          Resource: {
            Ref: "CloudWatchAlarmTokenRefreshThrottlesTopicPagerDuty",
          },
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
});
