import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';
import { AlarmTestCase } from './alarm-test-case';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

const testCases: AlarmTestCase[] = [
  {
    name: 'Shared Signal Health Check',
    alarmName: `shared-signal-health-check-errors-alarm`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    alarmResource: 'SharedSignalHealthCheckAlarmErrors',
    topicResource: 'CloudWatchAlarmTopicPagerDuty',
    subscriptionResource: 'CloudWatchAlarmTopicSubscriptionPagerDuty',
    topicPolicyResource: 'CloudWatchAlarmPublishToTopicPolicy',
    slackChannelConfigurationResource: 'SlackSupportChannelConfiguration',
    metricName: 'Errors',
    alarmDescription:
      'Alarm when the shared signal health check error exceeds 1 incident per 20 minutes.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Sum',
    period: 1200,
    evaluationPeriods: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: { Ref: 'SharedSignalHealthCheckFunction' },
      },
    ],
  },
  {
    name: 'Shared Signal Health Check Failed Invocations',
    alarmName: `shared-signal-health-check-failed-invocations-alarm`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    alarmResource: 'SharedSignalHealthCheckAlarmFailedInvocations',
    topicResource: 'CloudWatchAlarmTopicPagerDuty',
    subscriptionResource: 'CloudWatchAlarmTopicSubscriptionPagerDuty',
    topicPolicyResource: 'CloudWatchAlarmPublishToTopicPolicy',
    slackChannelConfigurationResource: 'SlackSupportChannelConfiguration',
    metricName: 'Invocations',
    alarmDescription:
      'Alarm when the shared signal health check failed invocations exceed 1 incident per 20 minutes.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Sum',
    period: 1200,
    evaluationPeriods: 1,
    threshold: 0,
    comparisonOperator: 'LessThanOrEqualToThreshold',
    dimensions: [
      {
        Name: 'FunctionName',
        Value: { Ref: 'SharedSignalHealthCheckFunction' },
      },
    ],
  },
];

describe.each(testCases)(
  'Set up CloudWatch Alarm for $name with supporting alarm resources',
  ({
    alarmName,
    actionsEnabled,
    alarmResource,
    topicResource,
    subscriptionResource,
    topicPolicyResource,
    slackChannelConfigurationResource,
    metricName,
    namespace,
    alarmDescription,
    dimensions,
    statistic,
    extendedStatistic,
    period,
    evaluationPeriods,
    threshold,
    comparisonOperator,
  }) => {
    const cloudWatchAlarmResources = template.findResources(
      'AWS::CloudWatch::Alarm',
    );
    const cloudWatchAlarmUnderTest = cloudWatchAlarmResources[
      alarmResource
    ] as any;

    const snsTopicResources = template.findResources('AWS::SNS::Topic');
    const snsTopicUnderTest = snsTopicResources[topicResource] as any;

    const subscriptionResources = template.findResources(
      'AWS::SNS::Subscription',
    );
    const subscriptionUnderTest = subscriptionResources[
      subscriptionResource
    ] as any;

    const topicPolicies = template.findResources('AWS::SNS::TopicPolicy');
    const topicPolicyUnderTest = topicPolicies[topicPolicyResource] as any;

    const slackChannelConfigurationResources = template.findResources(
      'AWS::Chatbot::SlackChannelConfiguration',
    );
    const slackChannelConfigurationUnderTest =
      slackChannelConfigurationResources[
        slackChannelConfigurationResource
      ] as any;

    const slackChannelIAMRole = template.findResources('AWS::IAM::Role');

    const slackChannelIAMRoleUnderTest = slackChannelIAMRole[
      'SlackSupportChannelConfigurationIAMRole'
    ] as any;

    it('should have a Slack Channel Configuration resource', () => {
      expect(slackChannelConfigurationUnderTest).toBeDefined();
      expect(slackChannelConfigurationUnderTest.Type).toEqual(
        'AWS::Chatbot::SlackChannelConfiguration',
      );
      expect(slackChannelConfigurationUnderTest.Properties).toBeDefined();
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackChannelId,
      ).toEqual({
        'Fn::Sub':
          '{{resolve:ssm:/${ConfigStackName}/slack/out-of-hours-channel-id}}',
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SlackWorkspaceId,
      ).toEqual({
        'Fn::Sub': '{{resolve:ssm:/${ConfigStackName}/slack/workspace-id}}',
      });
      expect(slackChannelConfigurationUnderTest.Properties.IamRoleArn).toEqual({
        'Fn::GetAtt': ['SlackSupportChannelConfigurationIAMRole', 'Arn'],
      });
      expect(
        slackChannelConfigurationUnderTest.Properties.SnsTopicArns,
      ).toEqual([
        {
          Ref: 'CloudWatchAlarmTopicPagerDuty',
        },
      ]);
      expect(slackChannelConfigurationUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });

    it('should have a Slack Channel IAM Role', () => {
      expect(slackChannelIAMRoleUnderTest).toBeDefined();
      expect(slackChannelIAMRoleUnderTest.Type).toEqual('AWS::IAM::Role');
      expect(slackChannelIAMRoleUnderTest.Properties).toBeDefined();
      expect(
        slackChannelIAMRoleUnderTest.Properties.PermissionsBoundary,
      ).toEqual({
        'Fn::If': [
          'UsePermissionsBoundary',
          {
            Ref: 'PermissionsBoundary',
          },
          {
            Ref: 'AWS::NoValue',
          },
        ],
      });
      expect(
        slackChannelIAMRoleUnderTest.Properties.AssumeRolePolicyDocument,
      ).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'chatbot.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      });
      expect(slackChannelIAMRoleUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });

    it(`should create a CloudWatch alarm for ${metricName}`, () => {
      expect(cloudWatchAlarmUnderTest).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Type).toEqual('AWS::CloudWatch::Alarm');
      expect(cloudWatchAlarmUnderTest.Properties).toBeDefined();
      expect(cloudWatchAlarmUnderTest.Properties.AlarmName).toEqual({
        'Fn::Sub': '${AWS::StackName}-' + alarmName,
      });
      expect(cloudWatchAlarmUnderTest.Properties.ActionsEnabled).toEqual(
        actionsEnabled,
      );

      const actualDescription =
        cloudWatchAlarmUnderTest.Properties.AlarmDescription['Fn::Sub'];

      expect(actualDescription.includes(alarmDescription)).toBeTruthy();
      expect(cloudWatchAlarmUnderTest.Properties.MetricName).toEqual(
        metricName,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Namespace).toEqual(namespace);

      expect(cloudWatchAlarmUnderTest.Properties.Statistic).toEqual(statistic);
      expect(cloudWatchAlarmUnderTest.Properties.ExtendedStatistic).toEqual(
        extendedStatistic,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Period).toEqual(period);
      expect(cloudWatchAlarmUnderTest.Properties.EvaluationPeriods).toEqual(
        evaluationPeriods,
      );

      expect(cloudWatchAlarmUnderTest.Properties.Threshold).toEqual(threshold);
      expect(cloudWatchAlarmUnderTest.Properties.ComparisonOperator).toEqual(
        comparisonOperator,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Dimensions).toEqual(
        dimensions,
      );
      expect(cloudWatchAlarmUnderTest.Properties.AlarmActions).toEqual([
        { Ref: topicResource },
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.OKActions).toEqual([
        { Ref: topicResource },
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });

    it(`should create a SNS topic for ${metricName}`, () => {
      expect(snsTopicUnderTest).toBeDefined();
      expect(snsTopicUnderTest.Type).toEqual('AWS::SNS::Topic');
      expect(snsTopicUnderTest.Properties).toBeDefined();
      expect(snsTopicUnderTest.Properties.DisplayName).toEqual({
        'Fn::Sub': '${AWS::StackName}-cloudwatch-alarm-topic',
      });
      expect(snsTopicUnderTest.Properties.KmsMasterKeyId).toEqual({
        Ref: 'CloudWatchAlarmNotificationTopicKey',
      });
      expect(snsTopicUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });

    it(`should create a SNS subscription for ${metricName}`, () => {
      expect(subscriptionUnderTest).toBeDefined();
      expect(subscriptionUnderTest.Type).toEqual('AWS::SNS::Subscription');
      expect(subscriptionUnderTest.Properties).toBeDefined();
      expect(subscriptionUnderTest.Properties.Protocol).toEqual({
        'Fn::If': ['IsNotProduction', 'lambda', 'https'],
      });
      expect(subscriptionUnderTest.Properties.Endpoint).toEqual({
        'Fn::If': [
          'IsNotProduction',
          { 'Fn::GetAtt': ['PagerDutyTestFunction', 'Arn'] },
          {
            'Fn::Sub': '{{resolve:ssm:/${ConfigStackName}/pager-duty/url}}',
          },
        ],
      });
      expect(subscriptionUnderTest.Properties.TopicArn).toEqual({
        Ref: topicResource,
      });
    });

    it(`should create an SNS topic policy for ${metricName}`, () => {
      expect(topicPolicyUnderTest).toBeDefined();
      expect(topicPolicyUnderTest.Type).toEqual('AWS::SNS::TopicPolicy');
      expect(topicPolicyUnderTest.Properties).toBeDefined();
      expect(topicPolicyUnderTest.Properties.PolicyDocument).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'cloudwatch.amazonaws.com' },
            Action: 'sns:Publish',
            Resource: { Ref: topicResource },
            Condition: {
              ArnLike: {
                'AWS:SourceArn': {
                  'Fn::Sub':
                    'arn:aws:cloudwatch:${AWS::Region}:${AWS::AccountId}:alarm:*',
                },
              },
            },
          },
        ],
      });
    });
  },
);
