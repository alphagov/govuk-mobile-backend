import "dotenv/config";
import { beforeAll, describe, it, expect } from "vitest";
import axios from "axios";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const input = {
  CognitoIdpUrl: process.env.CFN_UserPoolProviderUrl,
  ClientId: process.env.CFN_AppUserPoolClientId,
  WafLogGroupName: process.env.CFN_CognitoWafLogGroupName,
};

const maxAttempts = 10;
const backoffDelay = 5000;
const delayMs = 1;
const requests = 45000;
const responses: number[] = [];

const repeatedlyRequestCognitoIdpEndpoint = async (
  numRequests: number
): Promise<void> => {
  for (let i = 0; i < numRequests; i++) {
    const username = `testuser${i}@example.com`;
    const payload = {
      AuthParameters: {
        USERNAME: username,
        PASSWORD: "FakePassword123!", // pragma: allowlist secret
      },
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: input.ClientId,
    };

    try {
      const response = await axios.post(
        input.CognitoIdpUrl as string,
        payload,
        {
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
          },
          validateStatus: () => true,
        }
      );
      responses.push(response.status);
    } catch (e) {
      responses.push(e.response.status);
    }

    // escape early
    if (responses.includes(429)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
};

const checkRateLimitLogsInCloudWatch = async (): Promise<boolean> => {
  const client = new CloudWatchLogsClient({ region: "eu-west-2" });

  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;

  const command = new FilterLogEventsCommand({
    logGroupName: input.WafLogGroupName,
    startTime: tenMinutesAgo,
    endTime: now,
    filterPattern: '"RateLimitRule"',
  });

  let response;
  let attempts = 0;

  do {
    response = await client.send(command);
    if (response.events) {
      break;
    }

    attempts++;

    if (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  } while (attempts < maxAttempts);

  const events = response.events || [];
  return events.length > 0;
};


describe("Cognito WAF Rate Limit Protection", () => {
  beforeAll(async () => {
    await repeatedlyRequestCognitoIdpEndpoint(requests);
  });

  it("should respond with 429 error code when rate limit is exceeded", async () => {
    expect(responses).toContain(429);
  });
  it("should write to CloudWatch when rate limit is exceeded", async () => {
    const cloudWatchLogsFound = await checkRateLimitLogsInCloudWatch();
    expect(cloudWatchLogsFound).toBe(true);
  });
});
