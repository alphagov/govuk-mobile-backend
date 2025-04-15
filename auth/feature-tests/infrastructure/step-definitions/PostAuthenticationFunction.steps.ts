import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { expect } from "vitest";


const feature = await loadFeature(
  "feature-tests/infrastructure/features/PostAuthenticationFunction.feature"
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
    `A template can deploy the GOV UK Post Authentication Lambda`,
    ({ Given, Then }) => {
      Given(
        `a template to deploy the GOV UK Post Authentication Lambda`,
        () => {}
      );
      Then(
        `the template must have the required resource and properties to deploy the GOV UK Post Authentication Lambda`,
        () => {
          template.hasResourceProperties(
            "AWS::Serverless::Function",
            Match.objectLike({
              Handler: "app.lambdaHandler",
              CodeUri: Match.anyValue(),
              Tags: {
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
