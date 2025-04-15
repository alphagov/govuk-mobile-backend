import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { Template, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { readFileSync } from "fs";
import { load } from "js-yaml";

const feature = await loadFeature(
  "feature-tests/infrastructure/features/CognitoWAFAssociation.feature"
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
    `A template can associate the GOV UK Cognito Userpool with a WAF`,
    ({ Given, Then }) => {
      Given(
        `a template to deploy associate GOV UK Mobile Cognito Userpool with a WAF`,
        () => {}
      );
      Then(
        `the template must have the required resource and properties to deploy the association between GOV UK Mobile Cognito Userpool and a WAF`,
        () => {
          template.hasResourceProperties(
            "AWS::WAFv2::WebACLAssociation",
            Match.objectEquals({
              ResourceArn: {
                "Fn::GetAtt": ["CognitoUserPool", "Arn"],
              },
              WebACLArn: {
                "Fn::GetAtt": ["WebApplicationFirewall", "Arn"],
              },
            })
          );
        }
      );
    }
  );
});
