import {
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
  DescribeLogGroupsResponse,
} from '@aws-sdk/client-cloudwatch-logs';
import { assert, describe, it } from 'vitest';
import { testConfig } from '../common/config';
import { TestLambdaDriver } from '../../../../libs/test-utils/src/aws/testLambda.driver';

const driver = new TestLambdaDriver({
  region: testConfig.region,
  functionName: testConfig.testLambdaFunctionName,
});

const commandInput: DescribeLogGroupsCommandInput = {
  logGroupNamePrefix: testConfig.sharedSignalAccessLogGroupName, //API gateway log group name
};
const command = new DescribeLogGroupsCommand(commandInput);

describe('Check the deployed Shared Signal Access log group', async () => {
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
  it('has a correct retention period in days', () => {
    const nonProdRetentionPeriod = 30;
    const expectedRetentionPeriodForProd = 30; //change to 365 once logs are cleared
    const isNonProductionEnvironment = testConfig.environment !== 'production';
    isNonProductionEnvironment
      ? assert.equal(logGroup.retentionInDays, nonProdRetentionPeriod)
      : assert.equal(logGroup.retentionInDays, expectedRetentionPeriodForProd);
  });
});
