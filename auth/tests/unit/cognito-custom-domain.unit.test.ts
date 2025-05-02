import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Cognito User Custom Domain", () => {
  beforeAll(() => {
    const yamlTemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamlTemplate);
  });
  it("has an associated user pool", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      UserPoolId: {
        Ref: "CognitoUserPool",
      },
    });
  });
  it("has a custom domain", () => {
    template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      Domain: {
        "Fn::If": [
          "IsDev",
          {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::FindInMap": [
                    "CustomDomain",
                    "Environment",
                    { Ref: "Environment" },
                  ],
                },
                { "Fn::Sub": "-${AWS::StackName}" },
              ],
            ],
          },
          {
            "Fn::FindInMap": [
              "CustomDomain",
              "Environment",
              { Ref: "Environment" },
            ],
          },
        ],
      },
    });
  });
});
