import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Cognito User Pool OIDC client", () => {
  beforeAll(() => {
    const yamlTemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamlTemplate);
  });

  it("should refer to cognito user pool", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      UserPoolId: {
        Ref: "CognitoUserPool",
      },
    });
  });

  it("has onelogin as IDP", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      SupportedIdentityProviders: ["onelogin"],
    });
  });

  it("has correct Allowed OAuth Flow set", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AllowedOAuthFlows: ["code"],
    });
  });

  it("has correct AllowedOAuthScopes", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AllowedOAuthScopes: ["email", "openid"],
    });
  });

  it("should not generate secrets", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: false,
    });
  });

  it("has a callback url", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      CallbackURLs: ["govuk://govuk/login-auth-callback"],
    });
  });

  it("has a logout url", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      LogoutURLs: ["govuk://govuk/logout-auth"],
    });
  });

  it("has correct tokens validity", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AccessTokenValidity: 3600, //one hr
      IdTokenValidity: 3600, // one hr
      RefreshTokenValidity: 31536000, //one year
    });
  });
});
