export type AlarmTestCase = {
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
