import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config";

const client = new CognitoIdentityProviderClient({ region: testConfig.region });
const command = new DescribeUserPoolCommand({
  UserPoolId: testConfig.userPoolId,
});

describe("Check deployed Cognito User Pool Client", async () => {
  const response = await client.send(command);
  const userPool = response.UserPool!;

  it("should have DeletionProtection set to ACTIVE", () => {
    assert.equal(userPool.DeletionProtection, "ACTIVE");
  });

  it("should have MFA configuration set to OFF", () => {
    assert.equal(userPool.MfaConfiguration, "OFF");
  });

  it("should have UsernameAttributes containing 'email'", () => {
    assert.include(userPool.UsernameAttributes, "email");
  });

  it("should have UserPoolTags with correct values", () => {
    assert.deepEqual(userPool.UserPoolTags, {
      Environment: "dev",
      Product: "GOV.UK",
      System: "Authentication",
    });
  });

  it("should have a schema attribute 'email' that is required", () => {
    const emailAttr = userPool.SchemaAttributes.find((a) => a.Name === "email");
    assert.isDefined(emailAttr);
    assert.isTrue(emailAttr!.Required);
  });

  it("should have UserPoolTier set to ESSENTIALS", () => {
    assert.equal(userPool.UserPoolTier, "ESSENTIALS");
  });

  it("should have a LambdaConfig with PostAuthentication defined", () => {
    assert.isDefined(userPool.LambdaConfig.PostAuthentication);
    assert.match(userPool.LambdaConfig.PostAuthentication, /^arn:aws:lambda:/);
  });
});
