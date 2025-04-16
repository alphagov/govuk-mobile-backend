import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";

const feature = await loadFeature(
  "feature-tests/infrastructure/features/CognitoUserPool.feature"
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
    `A template can deploy the Cognito Userpool`,
    ({ Given, Then }) => {
      Given(
        `a template to deploy the Cognito Userpool`,
        () => {}
      );
      Then(
        `the template must have the required resource and properties to deploy the Cognito Userpool`,
        () => {
          template.hasResourceProperties(
            "AWS::Cognito::UserPool",
            Match.objectEquals({
              UserPoolName: {
                "Fn::Join": [
                  "-",
                  [
                    {
                      Ref: "AWS::StackName",
                    },
                    "user-pool",
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
              LambdaConfig: {
                PreAuthentication: {
                  "Fn::GetAtt": [
                    "PreAuthenticationFn",
                    "Arn"
                  ]
                },
                PostAuthentication: {
                  "Fn::GetAtt": [
                    "PostAuthenticationFunction",
                    "Arn",
                  ],
                },
              },
              DeletionProtection: "ACTIVE",
              UsernameAttributes: ["email"],
              Schema: [
                {
                  AttributeDataType: "String",
                  Name: "email",
                  Required: true,
                },
              ],
              UserPoolTags: {
                Environment: { Ref: "Environment" },
                Product: "GOV.UK",
                System: "Authentication",
              },
            })
          );
        }
      );
    }
  );
});
