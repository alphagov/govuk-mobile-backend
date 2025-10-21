export type AlarmTestCase = {
  name: string;
  alarmName: string;
  actionsEnabled: boolean;
  alarmResource: string;
  topicResource: object;
  metricName: string;
  alarmDescription: string;
  topicDisplayName: string;
  period: number;
  evaluationPeriods: number;
  datapointsToAlarm?: number;
  threshold: number;
  comparisonOperator: string;
  dimensions?: any[];
  namespace?: string;
  statistic?: string;
  extendedStatistic?: string;
};
