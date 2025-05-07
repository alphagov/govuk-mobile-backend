import "dotenv/config";
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import axios from "axios";
import { expect } from "vitest";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const feature = await loadFeature(
  "feature-tests/functional/features/cognito-rate-limit-protection.feature"
);

const NUM_REQUESTS = 45000;
const DELAY_MS = 1;
const REGION = "eu-west-2";
const responses: number[] = [];

let COGNITO_IDP_URL: string;
let CFN_AppUserPoolClientId: string;
let WAF_LOG_GROUP_NAME: string;

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    `Exceeding the WAF rate limit on the Cognito Identity Provider endpoint`,
    ({ Given, When, Then }) => {
      Given(`The Cognito Identity Provider endpoint`, () => {
        const cognitoIdpUrl = process.env.COGNITO_IDP_URL;
        const cognitoAppClientId = process.env.CFN_AppUserPoolClientId;
        const wafLogGroupName = process.env.WAF_LOG_GROUP_NAME;

        if (!cognitoIdpUrl) {
          throw new Error("COGNITO_IDP_URL is not set in the environment");
        }
        if (!cognitoAppClientId) {
          throw new Error("CFN_AppUserPoolClientId is not set in the environment");
        }
        if (!wafLogGroupName) {
          throw new Error("WAF_LOG_GROUP_NAME is not set in the environment");
        }
        COGNITO_IDP_URL = cognitoIdpUrl;
        CFN_AppUserPoolClientId = cognitoAppClientId;
        WAF_LOG_GROUP_NAME = wafLogGroupName;
      });
      When(`Too many requests are sent to the endpoint`, async () => {
        for (let i = 0; i < NUM_REQUESTS; i++) {
          const username = `testuser${i}@example.com`;
          const payload = {
            AuthParameters: {
              USERNAME: username,
              PASSWORD: "FakePassword123!", // pragma: allowlist secret
            },
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: CFN_AppUserPoolClientId,
          };

          try {
            const response = await axios.post(COGNITO_IDP_URL, payload, {
              headers: {
                "Content-Type": "application/x-amz-json-1.1",
                "X-Amz-Target":
                  "AWSCognitoIdentityProviderService.InitiateAuth",
              },
              validateStatus: () => true,
            });
            responses.push(response.status);
          } catch (e) {
            responses.push(e.response.status);
          }

          // escape early
          if (responses.includes(429)) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      });
      Then(
        `There should be a 429 Too Many Requests response and this should be logged in CloudWatch`,
        async () => {
          expect(responses).toContain(429);
          const cloudWatchLogsFound = await checkRateLimitLogsInCloudWatch();
          expect(cloudWatchLogsFound).toBe(true);
        }
      );
    }
  );
});

const checkRateLimitLogsInCloudWatch = async (): Promise<boolean> => {
  const client = new CloudWatchLogsClient({ region: REGION });

  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;

  const command = new FilterLogEventsCommand({
    logGroupName: WAF_LOG_GROUP_NAME,
    startTime: tenMinutesAgo,
    endTime: now,
    filterPattern: '"RateLimitRule"',
  });

  let response;
  let attempts = 0;
  const maxAttempts = 10;
  const backoffDelay = 5000;

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
