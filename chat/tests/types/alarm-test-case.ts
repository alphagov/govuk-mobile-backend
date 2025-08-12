export type AlarmTestCase = {
  name?: string;
  alarmName?: string;
  actionsEnabled?: boolean;
  alarmResource?: string;
  metricName: string;
  alarmDescription: string;
  topicResource: object;
  period: number;
  evaluationPeriods: number;
  datapointsToAlarm: number;
  threshold: number;
  comparisonOperator: string;
  dimensions?: any[];
  namespace?: string;
  statistic?: string;
  extendedStatistic?: string;
};
