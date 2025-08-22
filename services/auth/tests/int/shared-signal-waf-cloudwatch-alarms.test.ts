import { describe, it, expect, afterAll } from 'vitest';
import {
  CloudWatchClient,
  SetAlarmStateCommand,
  DescribeAlarmsCommand,
  DescribeAlarmHistoryCommand,
} from '@aws-sdk/client-cloudwatch';
import { testConfig } from '../common/config';
const cloudWatchClient = new CloudWatchClient({ region: 'eu-west-2' });

const alarmsToTest = [testConfig.sharedSignalWafThrottlingAlarm];

describe.runIf(testConfig.isLocalEnvironment).each(alarmsToTest)(
  'Shared Signal WAF throttling cloudWatch Alarm: %s',
  (alarmName) => {
    it('should successfully execute its actions', async () => {
      console.log(`Testing alarm: ${alarmName}`);
      // Set the alarm state to ALARM
      await cloudWatchClient.send(
        new SetAlarmStateCommand({
          AlarmName: alarmName,
          StateValue: 'ALARM',
          StateReason: 'Shared Signal WAF throttling ALARM state transition',
        }),
      );

      // Verify the alarm state
      const { MetricAlarms } = await cloudWatchClient.send(
        new DescribeAlarmsCommand({ AlarmNames: [alarmName] }),
      );

      expect(MetricAlarms?.[0]?.StateValue).toBe('ALARM');

      // Verify the alarm history executed an action
      const { AlarmHistoryItems } = await cloudWatchClient.send(
        new DescribeAlarmHistoryCommand({
          AlarmName: alarmName,
          HistoryItemType: 'Action',
        }),
      );
      expect(AlarmHistoryItems?.[0]?.HistorySummary).toContain(
        'Successfully executed action',
      );

      // Set the alarm state back to OK
      await cloudWatchClient.send(
        new SetAlarmStateCommand({
          AlarmName: alarmName,
          StateValue: 'OK',
          StateReason: 'Shared Signal API gateway OK state transition',
        }),
      );
      // Verify the alarm state
      const { MetricAlarms: updatedMetricAlarms } = await cloudWatchClient.send(
        new DescribeAlarmsCommand({ AlarmNames: [alarmName] }),
      );
      expect(updatedMetricAlarms?.[0]?.StateValue).toBe('OK');

      // Verify the alarm history executed an action
      const { AlarmHistoryItems: updatedAlarmHistoryItems } =
        await cloudWatchClient.send(
          new DescribeAlarmHistoryCommand({
            AlarmName: alarmName,
            HistoryItemType: 'Action',
          }),
        );
      expect(updatedAlarmHistoryItems?.[0]?.HistorySummary).toContain(
        'Successfully executed action',
      );
    });
  },
);
