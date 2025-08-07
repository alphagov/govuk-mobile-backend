export type AlarmTestCase = {
  name: string;
  alarmName: string;
  actionsEnabled: boolean;
  metricName?: string;
  alarmDescription: string;
  topicDisplayName: string;
  statistic?: string;
  extendedStatistic?: string;
  period?: number;
  evaluationPeriods: number;
  datapointsToAlarm: number;
  threshold?: number;
  comparisonOperator: string;
  dimensions: any[];
  namespace?: string;
};
