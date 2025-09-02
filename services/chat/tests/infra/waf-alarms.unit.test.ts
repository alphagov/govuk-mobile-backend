import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';
import { AlarmTestCase } from '../types/alarm-test-case';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

const testCases: AlarmTestCase[] = [
  {
    name: 'ChatProxyBlockedRequests',
    alarmName: 'chat-proxy-waf-rate-limit',
    actionsEnabled: true,
    alarmResource: 'CloudWatchAlarmChatProxyWafAlarm',
    namespace: 'AWS/WAFV2',
    metricName: 'BlockedRequests',
    alarmDescription:
      'Alarm when the Chat Proxy WAF rate limit exceeds 300 requests per 5 minutes',
    topicResource: {
      'Fn::Sub':
        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${AuthStackName}-cloudwatch-alarm-topic',
    },
    statistic: 'Sum',
    extendedStatistic: undefined,
    period: 300,
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    threshold: 300,
    comparisonOperator: 'GreaterThanThreshold',
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
      const actualDimensions =
        cloudWatchAlarmUnderTest.Properties.Dimensions || [];
      expect(actualDimensions.map((d) => d.Name)).toEqual([
        'WebACL',
        'Rule',
        'Region',
      ]);
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
