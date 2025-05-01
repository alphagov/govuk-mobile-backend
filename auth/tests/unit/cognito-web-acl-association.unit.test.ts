import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Web ACL Association for Cognito for GovUK app", () => {
  beforeAll(() => {
    const yamltemplate: string = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
  it("has an associated user pool", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACLAssociation", {
      ResourceArn: {
        "Fn::GetAtt": ["CognitoUserPool", "Arn"],
      },
      WebACLArn: {
        "Fn::GetAtt": ["CognitoWebApplicationFirewall", "Arn"],
      },
    });
  });
});
