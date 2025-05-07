import { describe, it } from "vitest";
import { loadTemplateFromFile } from '../common/template'

const template = loadTemplateFromFile('./template.yaml')

describe("Set up the Web ACL Association for Cognito for GovUK app", () => {
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
