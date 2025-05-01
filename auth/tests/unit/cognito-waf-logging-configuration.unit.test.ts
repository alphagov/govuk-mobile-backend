import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Cognito WAF Logging Configuration for GovUK app", () => {
  beforeAll(() => {
    const yamltemplate: string = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
  it("has a log destination config", () => {
    template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
      LogDestinationConfigs: [{ "Fn::GetAtt": ["CognitoWAFLogGroup", "Arn"] }],
    });
  });
  it("has an association with the cognito waf", () => {
    template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
      LogDestinationConfigs: [{ "Fn::GetAtt": ["CognitoWAFLogGroup", "Arn"] }],
    });
  });
});
