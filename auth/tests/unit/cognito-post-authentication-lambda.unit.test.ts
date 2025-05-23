import { describe, it, beforeAll, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Set up the Post Authentication Lambda for GovUK app", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    Metadata: any;
  };

  beforeAll(() => {
    const resource = template.findResources("AWS::Serverless::Function");
    resourceUnderTest = resource["PostAuthenticationFunction"] as any; // find Post Authentication Lambda function
  });
  it("should have type of Serverless function", () => {
    expect(resourceUnderTest.Type).equal("AWS::Serverless::Function");
  });

  it("should have a code uri", () => {
    expect(resourceUnderTest.Properties.CodeUri).equal(
      "post-authentication-function/"
    );
  });

  it("should have a handler", () => {
    expect(resourceUnderTest.Properties.Handler).equal("app.lambdaHandler");
  });

  it("has the required tags", () => {
    expect(resourceUnderTest.Properties.Tags).toEqual({
      Environment: {
        Ref: "Environment",
      },
      Product: "GOV.UK",
      System: "Authentication",
    });
  });

  it("has the required metadata", () => {
    expect(resourceUnderTest.Metadata).toEqual({
      BuildMethod: "esbuild",
      BuildProperties: {
        EntryPoints: ["app.ts"],
        Minify: true,
        SourceMap: false,
        Target: "es2020",
      },
    });
  });
});

describe("Set up the Post Authentication Lambda Invoke Permissions for GovUK app", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  beforeAll(() => {
    const resource = template.findResources("AWS::Lambda::Permission");
    resourceUnderTest = resource["PostAuthLambdaInvokePermission"] as any; // find Post Authentication Lambda function
  });
  it("should have type of lambda permission", () => {
    expect(resourceUnderTest.Type).equal("AWS::Lambda::Permission");
  });

  it("should refer to the post authentication function", () => {
    expect(resourceUnderTest.Properties.FunctionName).toEqual({
      Ref: "PostAuthenticationFunction",
    });
  });

  it("should have a lambda invoke action", () => {
    expect(resourceUnderTest.Properties.Action).toEqual(
      "lambda:InvokeFunction"
    );
  });

  it("should have a principal for the cognito idp", () => {
    expect(resourceUnderTest.Properties.Principal).toEqual(
      "cognito-idp.amazonaws.com"
    );
  });

  it("should have a source arn relating to the post authentication function", () => {
    expect(resourceUnderTest.Properties.SourceArn).toEqual({
      "Fn::GetAtt": ["CognitoUserPool", "Arn"],
    });
  });
});
