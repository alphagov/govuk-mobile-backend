import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import {expect} from "vitest";

const feature = await loadFeature(
  "feature-tests/infrastructure/features/CognitoUserPoolClient.feature"
);

let template: Template;

describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
  BeforeAllScenarios(() => {
    const yamltemplate = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate as any);
  });
  Scenario(
    `A template can deploy the GOV UK Mobile Cognito Userpool Client`,
    ({ Given, Then }) => {
      Given(
        `a template to deploy the GOV UK Mobile Cognito Userpool Client`,
        () => {}
      );
      Then(
        `the template must have the required resource and properties to deploy the GOV UK Mobile Cognito Userpool Client`,
        () => {
          template.hasResourceProperties(
            "AWS::Cognito::UserPoolClient",
            Match.objectEquals({
              ClientName: {
                "Fn::Join": [
                  "-",
                  [
                    {
                      Ref: "AWS::StackName",
                    },
                    "user-pool-client",
                    {
                      "Fn::Select": [
                        4,
                        {
                          "Fn::Split": [
                            "-",
                            {
                              "Fn::Select": [
                                2,
                                {
                                  "Fn::Split": [
                                    "/",
                                    {
                                      Ref: "AWS::StackId",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                ],
              },
              SupportedIdentityProviders: [
                  "COGNITO",
              ],
              CallbackURLs: [
                {
                  "Fn::Join": [
                    "",
                    [
                      "https://",
                      {
                        Ref: "AWS::StackName",
                      },
                      ".",
                      {
                        Ref: "Environment",
                      },
                      ".gov.uk/auth/callback",
                    ],
                  ],
                },
              ],
              LogoutURLs: [
                {
                  "Fn::Join": [
                    "",
                    [
                      "https://",
                      {
                        Ref: "AWS::StackName",
                      },
                      ".",
                      {
                        Ref: "Environment",
                      },
                      ".gov.uk/auth/logout",
                    ],
                  ],
                },
              ],
              TokenValidityUnits: {
                AccessToken: "seconds",
                IdToken: "seconds",
                RefreshToken: "seconds",
              },
              GenerateSecret: true,
              AccessTokenValidity: 3600,
              IdTokenValidity: 3600,
              RefreshTokenValidity: 31536000,
            })
          );
        }
      );
    }
  );
});