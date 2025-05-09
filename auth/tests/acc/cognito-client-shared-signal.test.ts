import "dotenv/config";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { assert, describe, it, expect } from "vitest";

const input = {
  UserPoolId: process.env.CFN_UserPoolId, 
  ClientId: process.env.CFN_SharedSignalClientId,
  TestEnvironment: process.env.TEST_ENVIRONMENT, 
};

const client = new CognitoIdentityProviderClient({ region: "eu-west-2" });
const command = new DescribeUserPoolClientCommand(input);
let response: any;
let userPoolClient: any;

describe("Check deployed shared signal Cognito User Pool Client", async () => {
  response = await client.send(command);
  userPoolClient = response.UserPoolClient;

  it("has allowed OAuth flows set to code", () => {
    assert.equal(userPoolClient.AllowedOAuthFlows[0], 'client_credentials');
  });

  it("has correct access token expiration", () => {
    const expectedAccessTokenDuration = 3600; // 1 hour
    assert.equal(userPoolClient.AccessTokenValidity, expectedAccessTokenDuration);
  });

  it("should not generate ID and Refresh token", () => {
    const expectedAccessTokenValidity = 3600;
    assert.equal(
      userPoolClient.AccessTokenValidity,
      expectedAccessTokenValidity
    );
  });

  it("has the client secret", () => {
    expect(userPoolClient.ClientSecret).toBeDefined();
  });

  it("has correct Allowed OAuth Flow", () => {
    const expectedScopes = ["client_credentials"];
    assert.deepEqual(userPoolClient.AllowedOAuthFlows, expectedScopes);
  });

  it("has NO callback URLs assigned", () => {
    expect(userPoolClient.CallbackURLs).toBeUndefined(); //M2M auth has no callback URLs
  });

  it("has token revocation enabled", () => {
    assert.isTrue(userPoolClient.EnableTokenRevocation);
  });

  it("has supported identity providers set correctly", () => {
    const expectedProviders = ["COGNITO"];
    assert.deepEqual(
      userPoolClient.SupportedIdentityProviders,
      expectedProviders
    );
  });

  it("has correct ExplicitAuthFlows", () => {
    const expectedExplicitAuthFlows = ["ALLOW_REFRESH_TOKEN_AUTH"];
    assert.deepEqual(userPoolClient.ExplicitAuthFlows, expectedExplicitAuthFlows);
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
