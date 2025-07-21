import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClientCredentialsDriver } from "../driver/client-credentials.driver";
import { testConfig } from "../common/config";
import { CognitoUserDriver } from "../driver/cognito-user.driver";
import { v4 as uuidv4 } from "uuid";

describe("shared-signals", () => {
  const passwordUpdateUserId = uuidv4();
  const passwordUpdateUserName = `${passwordUpdateUserId}@test.com`;

  beforeAll(() => {});

  afterAll(async () => {
    await new CognitoUserDriver(testConfig.userPoolId).deleteUserFromCognito(
      passwordUpdateUserName
    );
  });

  it("sends a password update signal with a valid user and receives a 202 response", async () => {
    // Generate an access token
    const accessToken = await new ClientCredentialsDriver(
      `/${testConfig.configStackName}/shared-signal/secrets-config`,
      testConfig.cognitoUrl
    ).getAccessToken();

    // Create a test user to send a signal for
    const cognitoUserId = await new CognitoUserDriver(
      testConfig.userPoolId
    ).createCognitoUserAndReturnUserName(passwordUpdateUserName);

    // Send a password update signal
    const response = await fetch(
      `${testConfig.sharedSignalsEndpoint}/receiver`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          iss: "https://identity.example.com",
          jti: "123e4567-e89b-12d3-a456-426614174000",
          iat: 1721126400,
          aud: "https://service.example.gov.uk",
          events: {
            "https://schemas.openid.net/secevent/caep/event-type/credential-change":
              {
                change_type: "update",
                credential_type: "password",
                subject: {
                  uri: cognitoUserId,
                  format: "urn:example:format:account-id",
                },
              },
            "https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation":
              {
                email: passwordUpdateUserName,
              },
          },
        }),
      }
    );

    expect(response.ok).toBe(true);
    expect(response.status).toBe(202);
  });

  it("sends a password update signal with an invalid user and receives a 500 response", async () => {
    // Generate an access token
    const accessToken = await new ClientCredentialsDriver(
      `/${testConfig.configStackName}/shared-signal/secrets-config`,
      testConfig.cognitoUrl
    ).getAccessToken();

    // Send a password update signal
    const response = await fetch(
      `${testConfig.sharedSignalsEndpoint}/receiver`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          iss: "https://identity.example.com",
          jti: "123e4567-e89b-12d3-a456-426614174000",
          iat: 1721126400,
          aud: "https://service.example.gov.uk",
          events: {
            "https://schemas.openid.net/secevent/caep/event-type/credential-change":
              {
                change_type: "update",
                credential_type: "password",
                subject: {
                  uri: uuidv4(),
                  format: "urn:example:format:account-id",
                },
              },
            "https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation":
              {
                email: "test@test.com",
              },
          },
        }),
      }
    );
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});
