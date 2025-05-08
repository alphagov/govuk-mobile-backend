import "dotenv/config";

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
} from "@aws-sdk/client-cloudwatch-logs";
import { assert, describe, it } from "vitest";

const input = {
  CognitoWafLogGroupName: process.env.CFN_CognitoWafLogGroupName,
};

const client = new CloudWatchLogsClient({ region: "eu-west-2" });
const commandInput: DescribeLogGroupsCommandInput = {
  logGroupNamePrefix: input.CognitoWafLogGroupName,
};
const command = new DescribeLogGroupsCommand(commandInput);

let response;
let logGroup;

describe("Check the deployed WAF log group", async () => {
  response = await client.send(command);
  logGroup = response.logGroups[0];
  console.log("logGroup", logGroup);
  it("has data protection activated", () => {
    const extpectedDataProtectionStatus = "ACTIVATED";
    assert.equal(logGroup.dataProtectionStatus, extpectedDataProtectionStatus);
  });
  it("has an associated KMS key", () => {
    assert.isNotEmpty(logGroup.kmsKeyId);
  });
  it("has a retention period of 30 days", () => {
    const expectedRetentionPeriod = 30;
    assert.equal(logGroup.retentionInDays, expectedRetentionPeriod);
  });
});
