import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';
import { AlarmTestCase } from '../types/alarm-test-case';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

const testCases: AlarmTestCase[] = [
  {
    name: 'Concurrency',
    alarmName: `authorizer-concurrency`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    alarmResource: 'CloudWatchAlarmAuthorizerConcurrency',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AppBackendStackName}-cloudwatch-alarm-topic',
    },
    metricName: 'ConcurrentExecutions',
    alarmDescription:
      'Alarm when the Authorizer Lambda concurrency approaches the limit, triggers at 80% of the limit.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    statistic: 'Maximum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 800,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      { Name: 'FunctionName', Value: { Ref: 'ChatAuthorizerFunction' } },
    ],
  },
  {
    name: 'Throttles',
    alarmName: `authorizer-throttles`,
    actionsEnabled: true,
    namespace: 'AWS/Lambda',
    alarmResource: 'CloudWatchAlarmAuthorizerThrottles',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AppBackendStackName}-cloudwatch-alarm-topic',
    },
    metricName: 'Throttles',
    alarmDescription: 'Alarm when the Authorizer Lambda is being throttled.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      { Name: 'FunctionName', Value: { Ref: 'ChatAuthorizerFunction' } },
    ],
  },
  {
    name: 'Timeouts',
    alarmName: `authorizer-timeout`,
    actionsEnabled: true,
    namespace: '${AWS::StackName}/Timeouts',
    alarmResource: 'CloudWatchAlarmAuthorizerTimeouts',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AppBackendStackName}-cloudwatch-alarm-topic',
    },
    metricName: 'ChatAuthorizerFunctionTimeout',
    alarmDescription:
      'Alarm when the Authorizer Lambda function is timing out.',
    topicDisplayName: 'cloudwatch-alarm-topic',
    period: 60,
    statistic: 'Sum',
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    dimensions: [
      { Name: 'FunctionName', Value: { Ref: 'ChatAuthorizerFunction' } },
    ],
  },
];

describe.each(testCases)(
  'Set up CloudWatch Alarm $alarmName for Lambda Authorizer',
  ({
    alarmName,
    actionsEnabled,
    alarmResource,
    topicResource,
    metricName,
    namespace,
    alarmDescription,
    dimensions,
    statistic,
    extendedStatistic,
    period,
    evaluationPeriods,
    datapointsToAlarm,
    threshold,
    comparisonOperator,
  }) => {
    const cloudWatchAlarmResources = template.findResources(
      'AWS::CloudWatch::Alarm',
    );
    const cloudWatchAlarmUnderTest = cloudWatchAlarmResources[
      alarmResource!
    ] as any;

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

      const actualNamespace = cloudWatchAlarmUnderTest.Properties.Namespace;
      if (typeof actualNamespace === 'object' && 'Fn::Sub' in actualNamespace) {
        expect(actualNamespace['Fn::Sub']).toEqual(namespace);
      } else {
        expect(actualNamespace).toEqual(namespace);
      }

      expect(cloudWatchAlarmUnderTest.Properties.Statistic).toEqual(statistic);
      expect(cloudWatchAlarmUnderTest.Properties.ExtendedStatistic).toEqual(
        extendedStatistic,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Period).toEqual(period);
      expect(cloudWatchAlarmUnderTest.Properties.EvaluationPeriods).toEqual(
        evaluationPeriods,
      );
      expect(cloudWatchAlarmUnderTest.Properties.DatapointsToAlarm).toEqual(
        datapointsToAlarm,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Threshold).toEqual(threshold);
      expect(cloudWatchAlarmUnderTest.Properties.ComparisonOperator).toEqual(
        comparisonOperator,
      );
      expect(cloudWatchAlarmUnderTest.Properties.Dimensions).toEqual(
        dimensions,
      );
      expect(cloudWatchAlarmUnderTest.Properties.AlarmActions).toEqual([
        topicResource,
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.OKActions).toEqual([
        topicResource,
      ]);
      expect(cloudWatchAlarmUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Chat' },
      ]);
    });
  },
);
