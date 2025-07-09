import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
} from "@aws-sdk/client-cloudwatch-logs";
import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config"

const client = new CloudWatchLogsClient({ region: testConfig.region });
const commandInput: DescribeLogGroupsCommandInput = {
  logGroupNamePrefix: testConfig.authProxyWafLogGroupName,
};
const command = new DescribeLogGroupsCommand(commandInput);

describe("Check the deployed Attestation WAF log group", async () => {
  const response = await client.send(command);
  const logGroup = response.logGroups?.[0];

  if (!logGroup) {
    throw new Error("Log group not found");
  }

  it("has data protection", () => {
    const expectedDataProtectionStatus = "ACTIVATED";
    assert.equal(logGroup.dataProtectionStatus, expectedDataProtectionStatus );
  });

  it("has an associated KMS key", () => {
    assert.isNotEmpty(logGroup.kmsKeyId);
  });

  it("has a retention period of 30 days", () => {
    const expectedRetentionPeriod = 30;
    assert.equal(logGroup.retentionInDays, expectedRetentionPeriod);
  });
});
