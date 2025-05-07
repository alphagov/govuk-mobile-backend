import "dotenv/config";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { assert, describe, it, beforeAll } from "vitest";

const input = {
  UserPoolId: process.env.CFN_UserPoolId,
  ClientId: process.env.CFN_AppUserPoolClientId,
  TestEnvironment: process.env.TEST_ENVIRONMENT,
};

const client = new CognitoIdentityProviderClient({ region: "eu-west-2" });
const command = new DescribeUserPoolClientCommand(input);
let response;
let userPoolClient;
const environmentMapping = [
  {
    environment: "build",
    oneLoginEnvironment: "integration",
  },
  {
    environment: "dev",
    oneLoginEnvironment: "integration",
  },
  {
    environment: "integration",
    oneLoginEnvironment: "integration",
  },
  {
    environment: "staging",
    oneLoginEnvironment: "staging",
  },
];

describe("Check deployed Cognito User Pool Client", async () => {
  response = await client.send(command);
  userPoolClient = response.UserPoolClient;
  it("has allowed OAuth flows set to code", () => {
    const expectedOauthFlows = "code";
    assert.equal(userPoolClient.AllowedOAuthFlows[0], expectedOauthFlows);
  });

  it("has identity token expiration set correctly", () => {
    const expectedIdTokenValidity = 3600;
    assert.equal(userPoolClient.IdTokenValidity, expectedIdTokenValidity);
  });

  it("has refresh token expiration set correctly", () => {
    const expectedRefreshTokenValidity = 31536000;
    assert.equal(
      userPoolClient.RefreshTokenValidity,
      expectedRefreshTokenValidity
    );
  });

  it("has access token expiration set correctly", () => {
    const expectedAccessTokenValidity = 3600;
    assert.equal(
      userPoolClient.AccessTokenValidity,
      expectedAccessTokenValidity
    );
  });

  it("has allowed OAuth flows user pool client enabled", () => {
    assert.isTrue(userPoolClient.AllowedOAuthFlowsUserPoolClient);
  });

  it("has allowed OAuth scopes set correctly", () => {
    const expectedScopes = ["email", "openid"];
    assert.deepEqual(userPoolClient.AllowedOAuthScopes, expectedScopes);
  });

  it("has callback URLs set correctly", () => {
    const expectedCallbackURLs = ["govuk://govuk/login-auth-callback"];
    assert.deepEqual(userPoolClient.CallbackURLs, expectedCallbackURLs);
  });

  it("has logout URL set correctly", () => {
    const currentEnvironment = input.TestEnvironment;
    const matchedEnvironment = environmentMapping.find(
      (env) => env.environment === currentEnvironment
    );
    if (!matchedEnvironment) {
      throw new Error(
        `No matching environment found for ${currentEnvironment}`
      );
    }
    const expectedLogoutUrl = [
      `https://oidc.${matchedEnvironment.oneLoginEnvironment}.account.gov.uk/logout`,
    ];

    assert.deepEqual(userPoolClient.LogoutURLs, expectedLogoutUrl);
  });

  it("has token revocation enabled", () => {
    assert.isTrue(userPoolClient.EnableTokenRevocation);
  });

  it("has supported identity providers set correctly", () => {
    const expectedProviders = ["onelogin"];
    assert.deepEqual(
      userPoolClient.SupportedIdentityProviders,
      expectedProviders
    );
  });

  it("has token validity units set correctly", () => {
    const expectedTokenValidityUnits = {
      AccessToken: "seconds",
      IdToken: "seconds",
      RefreshToken: "seconds",
    };
    assert.deepEqual(
      userPoolClient.TokenValidityUnits,
      expectedTokenValidityUnits
    );
  });

  it("has auth session validity set correctly", () => {
    const expectedAuthSessionValidity = 3;
    assert.equal(
      userPoolClient.AuthSessionValidity,
      expectedAuthSessionValidity
    );
  });

  it("has propagate additional user context data disabled", () => {
    assert.isFalse(userPoolClient.EnablePropagateAdditionalUserContextData);
  });
});
