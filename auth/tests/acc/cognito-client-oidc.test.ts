import {
  DescribeUserPoolClientCommand,
  DescribeUserPoolClientResponse,
  TimeUnitsType,
  TokenValidityUnitsType,
} from "@aws-sdk/client-cognito-identity-provider";
import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config";
import { TestLambdaDriver } from "../driver/testLambda.driver";

const driver = new TestLambdaDriver();
const command = new DescribeUserPoolClientCommand({
  UserPoolId: testConfig.userPoolId,
  ClientId: testConfig.clientId,
});
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

describe
  ("Check deployed Cognito User Pool Client", async () => {
    const response = await driver.performAction<DescribeUserPoolClientResponse>({
      command,
      action: "DescribeUserPoolClientCommand",
      service: "CognitoIdentityProviderClient",
    });
    const userPoolClient = response.UserPoolClient!;
    it("has allowed OAuth flows set to code", () => {
      const expectedOauthFlows = "code";
      assert.equal(userPoolClient.AllowedOAuthFlows?.[0], expectedOauthFlows);
    });

    describe('token validity', () => {
      const tokenUnits = userPoolClient.TokenValidityUnits;

      function parseTokenValidityToSeconds(value: number | undefined, unit: TimeUnitsType | undefined): number | undefined {
        if (value === undefined || unit === undefined) return undefined;
        switch (unit) {
          case TimeUnitsType.SECONDS:
            return value;
          case TimeUnitsType.MINUTES:
            return value * 60;
          case TimeUnitsType.HOURS:
            return value * 3600;
          case TimeUnitsType.DAYS:
            return value * 86400;
          default:
            return undefined;
        }
      }

      it("has identity token expiration set correctly", () => {
        const expectedIdTokenValidity = 3600;
        assert.equal(parseTokenValidityToSeconds(userPoolClient.IdTokenValidity, tokenUnits?.IdToken), expectedIdTokenValidity);
      });

  it("has refresh token expiration set correctly", () => {
    const expectedRefreshTokenValidity = 604800; // 7 days in seconds
    assert.equal(
      parseTokenValidityToSeconds(userPoolClient.RefreshTokenValidity, tokenUnits?.RefreshToken),
      expectedRefreshTokenValidity
    );
  });

      it("has access token expiration set correctly", () => {
        const expectedAccessTokenValidity = 300;
        assert.equal(
          parseTokenValidityToSeconds(userPoolClient.AccessTokenValidity, tokenUnits?.AccessToken),
          expectedAccessTokenValidity
        );
      });
    })


    it("has allowed OAuth flows user pool client enabled", () => {
      assert.isTrue(userPoolClient.AllowedOAuthFlowsUserPoolClient);
    });

    it("has allowed OAuth scopes set correctly", () => {
      const expectedScopes = ["email", "openid"];
      assert.deepEqual(userPoolClient.AllowedOAuthScopes, expectedScopes);
    });

    it("has callback URLs set correctly", () => {
      const expectedCallbackURLs = [
        "govuk://govuk/login-auth-callback",
        "https://d84l1y8p4kdic.cloudfront.net" // used for testing purposes
      ];
      assert.deepEqual(userPoolClient.CallbackURLs, expectedCallbackURLs);
    });

    it("has logout URL set correctly", () => {
      const currentEnvironment = testConfig.deployedEnvironment;
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
