import { describe, it, beforeAll } from "vitest";
import { loadTemplateFromFile } from '../common/template'

const template = loadTemplateFromFile('./template.yaml')

describe("Set up the Cognito User Custom Domain", () => {

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
