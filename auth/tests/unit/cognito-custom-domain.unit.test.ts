import { describe, it, beforeAll } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

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
       "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/cognito/custom-domain}}"
      },
    });
  });
});
