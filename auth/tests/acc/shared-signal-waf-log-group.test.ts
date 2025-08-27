import {
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
  DescribeLogGroupsResponse,
} from '@aws-sdk/client-cloudwatch-logs';
import { assert, describe, it } from 'vitest';
import { testConfig } from '../common/config';
import { TestLambdaDriver } from '../driver/testLambda.driver';

const driver = new TestLambdaDriver();

const commandInput: DescribeLogGroupsCommandInput = {
  logGroupNamePrefix: testConfig.sharedSignalWAFLogGroupName, //API gateway WAF log group name
};
const command = new DescribeLogGroupsCommand(commandInput);

describe('Check the deployed Shared Signal WAF log group', async () => {
  const response = await driver.performAction<DescribeLogGroupsResponse>({
    action: 'DescribeLogGroupsCommand',
    service: 'CloudWatchLogsClient',
    command,
  });
  const logGroup = response.logGroups?.[0];

  if (!logGroup) {
    throw new Error('Log group not found');
  }

  it('has data protection activated', () => {
    const expectedDataProtectionStatus = 'ACTIVATED';
    assert.equal(logGroup.dataProtectionStatus, expectedDataProtectionStatus);
  });
  it('has an associated KMS key', () => {
    assert.isNotEmpty(logGroup.kmsKeyId);
  });

  it('has a log group name with the required shared signal prefix', () => {
    assert.include(logGroup.logGroupName, `aws-waf-logs-shared-signal`);
  });

  it('has a retention period of 30 days', () => {
    const nonProdRetentionPeriod = 30;
    const expectedRetentionPeriodForProd = 30; //change to 365 once logs are cleared
    const isNonProductionEnvironment = testConfig.environment !== 'production';
    isNonProductionEnvironment
      ? assert.equal(logGroup.retentionInDays, nonProdRetentionPeriod)
      : assert.equal(logGroup.retentionInDays, expectedRetentionPeriodForProd);
  });
});
