import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { expect } from "vitest";

const feature = await loadFeature(
  "feature-tests/infrastructure/features/UserPoolIdentityProvider.feature"
);

let template: Template;

describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
  BeforeAllScenarios(() => {
    const yamltemplate = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });

  Scenario(
    `A template can deploy the User Pool Identity Provider`,
    ({ Given, Then }) => {
      Given(
        `a template to deploy the User Pool Identity Provider`,
        () => {}
      );
      Then(
        `the template must have the required resource and properties to deploy the User Pool Identity Provider`,
        () => {
          template.hasResourceProperties(
            "AWS::Cognito::UserPoolIdentityProvider",
            Match.objectEquals({
              UserPoolId: {
                Ref: "CognitoUserPool",
              },
              ProviderName: "onelogin",
              ProviderType: "OIDC",
              ProviderDetails: {
                attributes_request_method: 'GET',
                attributes_url: {
                  'Fn::Join': [
                    '',
                    [
                      'https://oidc.',
                      { Ref: 'Environment' },
                      '.account.gov.uk/userinfo',
                    ],
                  ],
                },
                attributes_url_add_attributes: false,
                authorize_scopes: 'openid email',
                authorize_url: {
                  'Fn::Join': [
                    '',
                    [
                      'https://oidc.',
                      { Ref: 'Environment' },
                      '.account.gov.uk/authorize',
                    ],
                  ],
                },
                client_id: '123',
                jwks_uri: {
                  'Fn::Join': [
                    '',
                    [
                      'https://oidc.',
                      { Ref: 'Environment' },
                      '.account.gov.uk/.well-known/jwks.json',
                    ],
                  ],
                },
                oidc_issuer: {
                  'Fn::Join': [
                    '',
                    [
                      'https://oidc.',
                      { Ref: 'Environment' },
                      '.account.gov.uk',
                    ],
                  ],
                },
                token_url: {
                  'Fn::Join': [
                    '',
                    [
                      'https://oidc.',
                      { Ref: 'Environment' },
                      '.account.gov.uk/token',
                    ],
                  ],
                },
              },
              IdpIdentifiers: ["onelogin"],
              AttributeMapping: { email: "email", username: "sub" },
            })
          );
        }
      );
    }
  );
});
