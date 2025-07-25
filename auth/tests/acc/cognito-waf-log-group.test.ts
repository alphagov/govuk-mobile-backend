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
  logGroupNamePrefix: testConfig.cognitoWafLogGroupName,
};
const command = new DescribeLogGroupsCommand(commandInput);

describe('Check the deployed WAF log group', async () => {
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
  it('has a retention period of 30 days', () => {
    const expectedRetentionPeriod = 30;
    assert.equal(logGroup.retentionInDays, expectedRetentionPeriod);
  });
});
