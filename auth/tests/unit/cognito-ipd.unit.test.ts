import { Template, Capture, Match, MatchResult } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Cognito User Pool Identity Provider for GovUK app", () => {
  beforeAll(() => {
    const yamltemplate: string = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
  it("has an associated user pool", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      UserPoolId: {
        Ref: "CognitoUserPool",
      },
    });
  });
  it("has a provider name", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      ProviderName: "onelogin",
    });
  });
  it("has a provider type OIDC", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      ProviderType: "OIDC",
    });
  });
  it("has provider details", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      ProviderDetails: {
        attributes_request_method: "GET",
        attributes_url: {
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
              ".account.gov.uk/userinfo",
            ],
          ],
        },
        attributes_url_add_attributes: false,
        authorize_scopes: "openid email",
        authorize_url: {
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
              ".account.gov.uk/authorize",
            ],
          ],
        },
        client_id: "{{resolve:ssm:/onelogin/client_id}}",
        client_secret:
          "{{resolve:secretsmanager:/onelogin/client_secret:SecretString}}",
        jwks_uri: {
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
              ".account.gov.uk/.well-known/jwks.json",
            ],
          ],
        },
        oidc_issuer: {
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
              ".account.gov.uk",
            ],
          ],
        },
        token_url: {
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
              ".account.gov.uk/token",
            ],
          ],
        },
      },
    });
  });
});
