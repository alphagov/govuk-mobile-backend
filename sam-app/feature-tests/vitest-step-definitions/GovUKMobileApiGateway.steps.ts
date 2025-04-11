import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";

const feature = await loadFeature(
  "feature-tests/vitest-features/GovUKMobileApiGateway.feature"
);

let template: Template;

describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
  BeforeAllScenarios(() => {
    let yamltemplate = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
  Scenario(
    `A template can deploy the GOV UK Api Gateway`,
    ({ Given, Then }) => {
      Given(`a template to deploy the GOV UK Api Gateway`, () => {});
      Then(
        `the template must have the required resource and properties to deploy the GOV UK Api Gateway`,
        () => {
          template.hasResourceProperties(
            "AWS::Serverless::Api",
            Match.objectEquals({
              Name: {
                "Fn::Join": [
                  "-",
                  [
                    {
                      Ref: "AWS::StackName",
                    },
                    "api-gateway",
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
              StageName: {
                Ref: "Environment"
              },
              Tags: {
                Environment: { "Ref": "Environment" },
                Product: "GOV.UK",
                System: "Authentication"
              }
            })
          );
        }
      );
    }
  );
});
