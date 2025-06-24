import { describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Set up the Cognito User Pool Identity Provider for GovUK app", () => {
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
    const identityProvider = template.findResources("AWS::Cognito::UserPoolIdentityProvider")["UserPoolIdentityProvider"] as any;

    expect(identityProvider.Properties.ProviderDetails).toEqual({
      "attributes_request_method": "GET",
      "attributes_url": [
        {
          "Fn::If": null,
        },
        "IsProduction",
        "https://oidc.account.gov.uk/userinfo",
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
                    "Ref": "Environment",
                  },
                ],
              },
              ".account.gov.uk/userinfo",
            ],
          ],
        },
      ],
      "attributes_url_add_attributes": false,
      "authorize_scopes": "openid email",
      "authorize_url": [
        {
          "Fn::If": [
            "IsProduction",
            "https://oidc.account.gov.uk/authorize",
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
                        "Ref": "Environment",
                      },
                    ],
                  },
                  ".account.gov.uk/authorize",
                ],
              ],
            },
          ],
        },
      ],
      "client_id": {
        "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/onelogin/client_id}}",
      },
      "client_secret": {
        "Fn::Sub": "{{resolve:secretsmanager:/${ConfigStackName}/onelogin/client_secret:SecretString}}",
      },
      "jwks_uri": [
        {
          "Fn::If": [
            "IsProduction",
            "https://oidc.account.gov.uk/.well-known/jwks.json",
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
                        "Ref": "Environment",
                      },
                    ],
                  },
                  ".account.gov.uk/.well-known/jwks.json",
                ],
              ],
            },
          ],
        },
      ],
      "oidc_issuer": [
        {
          "Fn::If": [
            "IsProduction",
            "https://oidc.account.gov.uk",
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
                        "Ref": "Environment",
                      },
                    ],
                  },
                  ".account.gov.uk",
                ],
              ],
            },
          ],
        },
      ],
      "token_url": [
        {
          "Fn::If": [
            "IsProduction",
            "https://oidc.account.gov.uk/token",
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
                        "Ref": "Environment",
                      },
                    ],
                  },
                  ".account.gov.uk/token",
                ],
              ],
            },
          ],
        },
      ],
    })
  });
  it("has idp identifiers", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      IdpIdentifiers: ["onelogin"],
    });
  });
  it("has attribute mapping", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      AttributeMapping: {
        email: "email",
        email_verified: "email_verified",
        username: "sub",
      },
    });
  });
});
