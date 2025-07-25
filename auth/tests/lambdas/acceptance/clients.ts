import {
  ChatbotClient,
  DescribeSlackChannelConfigurationsCommand,
} from '@aws-sdk/client-chatbot';
import {
  CloudWatchClient,
  DescribeAlarmHistoryCommand,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { GetTopicAttributesCommand, SNSClient } from '@aws-sdk/client-sns';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import {
  APIGatewayClient,
  GetMethodCommand,
  GetResourcesCommand,
} from '@aws-sdk/client-api-gateway';

/**
 * Map of supported AWS SDK clients
 *
 * This map allows us to dynamically get the client constructor based on the service name.
 */
export const SUPPORTED_AWS_SDK_CLIENTS: { [key: string]: any } = {
  CognitoIdentityProviderClient: CognitoIdentityProviderClient,
  CloudWatchLogsClient: CloudWatchLogsClient,
  SNSClient: SNSClient,
  ChatbotClient: ChatbotClient,
  CloudWatchClient: CloudWatchClient,
  SecretsManagerClient: SecretsManagerClient,
  // "LambdaClient": LambdaClient, not supported
  // "IAMClient": IAMClient, not supported
  APIGatewayClient: APIGatewayClient,
};

// --- Define a map of supported commands for each client ---
// This map allows us to dynamically get the command constructor based on the client and action.
// The keys here should match the 'service' and 'action' values in your incoming event.
export const SUPPORTED_AWS_SDK_COMMANDS: {
  [clientName: string]: { [commandName: string]: any };
} = {
  CognitoIdentityProviderClient: {
    DescribeUserPoolCommand: DescribeUserPoolCommand,
    DescribeUserPoolClientCommand: DescribeUserPoolClientCommand,
  },
  CloudWatchLogsClient: {
    DescribeLogGroupsCommand: DescribeLogGroupsCommand,
    FilterLogEventsCommand: FilterLogEventsCommand,
  },
  SNSClient: {
    GetTopicAttributesCommand: GetTopicAttributesCommand,
  },
  ChatbotClient: {
    DescribeSlackChannelConfigurationsCommand:
      DescribeSlackChannelConfigurationsCommand,
  },
  CloudWatchClient: {
    DescribeAlarmsCommand: DescribeAlarmsCommand,
    // "SetAlarmStateCommand": SetAlarmStateCommand, not supported
    DescribeAlarmHistoryCommand: DescribeAlarmHistoryCommand,
  },
  SecretsManagerClient: {
    GetSecretValueCommand: GetSecretValueCommand,
  },
  APIGatewayClient: {
    GetMethodCommand: GetMethodCommand,
    GetResourcesCommand: GetResourcesCommand,
  },
};
