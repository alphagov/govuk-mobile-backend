import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';
import { AlarmTestCase } from '../types/alarm-test-case';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

const testCases: AlarmTestCase[] = [
  {
    name: '4xx',
    alarmName: `chat-proxy-4xx-errors`,
    actionsEnabled: true,
    namespace: 'AWS/ApiGateway',
    alarmResource: 'CloudwatchAlarmChatProxy4xxErrors',
    metricName: '4XXError',
    alarmDescription: 'Alarm detects a high rate of client-side errors.',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AuthStackName}-cloudwatch-alarm-topic',
    },
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 0.05,
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: [
      { Name: 'ApiName', Value: { 'Fn::Sub': '${AWS::StackName}-chat-proxy' } },
      { Name: 'Stage', Value: { Ref: 'Environment' } },
    ],
  },
  {
    name: '5xx',
    alarmName: `chat-proxy-5xx-errors`,
    actionsEnabled: true,
    alarmResource: 'CloudwatchAlarmChatProxy5xxErrors',
    namespace: 'AWS/ApiGateway',
    metricName: '5XXError',
    alarmDescription: 'Alarm detects a high rate of server-side errors.',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AuthStackName}-cloudwatch-alarm-topic',
    },
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 3,
    datapointsToAlarm: 3,
    threshold: 0.05,
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: [
      { Name: 'ApiName', Value: { 'Fn::Sub': '${AWS::StackName}-chat-proxy' } },
      { Name: 'Stage', Value: { Ref: 'Environment' } },
    ],
  },
];

describe.each(testCases)(
  'Set up CloudWatch Alarm for Chat Api Gateway $name errors with supporting alarm resources',
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
      expect(cloudWatchAlarmUnderTest.Properties.Namespace).toEqual(namespace);

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
