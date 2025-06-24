import { describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Set up the Cognito User Pool OIDC client", () => {
  it("should refer to cognito user pool", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      UserPoolId: {
        Ref: "CognitoUserPool",
      },
    });
  });

  it("has onelogin as IDP", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      SupportedIdentityProviders: [
        {
          Ref: "UserPoolIdentityProvider",
        },
      ],
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

  it("should generate secret for proxy as confidential client", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: true,
    });
  });

  it("has a callback url", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      CallbackURLs: ["govuk://govuk/login-auth-callback"],
    });
  });

  it("has a logout url", () => {
    const userPoolClient = template.findResources("AWS::Cognito::UserPoolClient")["CognitoUserPoolClient"] as any;
    expect(userPoolClient.Properties.LogoutURLs).toEqual([
      {
        "Fn::If": null,
      },
      "IsProduction",
      "https://oidc.account.gov.uk/logout",
      {
        "Fn::Join": [
          "",
          [
            "https://oidc.",
            {
              "Fn::FindInMap": [
                "OneLogin",
                "Environment",
                {
                  Ref: "Environment",
                },
              ],
            },
            ".account.gov.uk/logout",
          ],
        ],
      },
    ])
  });

  it("has correct tokens validity", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AccessTokenValidity: 300, //5 minutes
      IdTokenValidity: 3600, // one hr
      RefreshTokenValidity: 2592000, // 30 days
    });
  });

  it("has token revocation enabled", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      EnableTokenRevocation: true,
    });
  });

  it("has allowed oauth flows", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AllowedOAuthFlowsUserPoolClient: true,
    });
  });
});
