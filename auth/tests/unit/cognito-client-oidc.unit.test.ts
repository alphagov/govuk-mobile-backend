import { describe, it } from "vitest";
import { loadTemplateFromFile } from '../common/template'

const template = loadTemplateFromFile('./template.yaml')

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
      LogoutURLs: [
        {
          "Fn::Join": [
            "",
            [
              "https://oidc.",
              {
                "Fn::FindInMap": [
                  "OneLogin",
                  "Environment",
                  { Ref: "Environment" },
                ],
              },
              ".account.gov.uk/logout",
            ],
          ],
        },
      ],
    });
  });

  it("has correct tokens validity", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AccessTokenValidity: 3600, //one hr
      IdTokenValidity: 3600, // one hr
      RefreshTokenValidity: 31536000, //one year
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
