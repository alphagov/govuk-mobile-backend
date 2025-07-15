import { describe, it, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import { testConfig } from "../common/config";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

type LambdaTestCase = {
  resourceName: string;
  functionName: string;
  codeUri: string;
  handler: string;
  role: string;
};

const testCases: LambdaTestCase[] = [
  {
    resourceName: "ChatAuthorizerFunction",
    functionName: "chat-proxy-authorizer",
    codeUri: "authorizer/",
    handler: "app.lambdaHandler",
    role: "ChatAuthorizerFunctionIAMRole",
  },
];

describe.each(testCases)(
  "Lambda function $functionName",
  ({ resourceName, functionName, codeUri, handler, role }) => {
    const resource = template.findResources("AWS::Serverless::Function");
    const resourceUnderTest = resource[resourceName] as any;
    it("should be defined", () => {
      expect(resourceUnderTest).toBeDefined();
    });

    it("should have type of Serverless function", () => {
      expect(resourceUnderTest.Type).toEqual("AWS::Serverless::Function");
    });

    it("should have a function name that includes the stack name", () => {
      expect(resourceUnderTest.Properties.FunctionName).toEqual({
        "Fn::Sub": "${AWS::StackName}-" + functionName,
      });
    });

    it("should have a code uri", () => {
      expect(resourceUnderTest.Properties.CodeUri).toEqual(codeUri);
    });

    it("should have a handler", () => {
      expect(resourceUnderTest.Properties.Handler).toEqual(handler);
    });

    it("should have a role", () => {
      expect(resourceUnderTest.Properties.Role).toEqual({
        "Fn::GetAtt": [role, "Arn"],
      });
    });

    it("has the required tags", () => {
      expect(resourceUnderTest.Properties.Tags).toEqual({
        Environment: {
          Ref: "Environment",
        },
        Product: "GOV.UK",
        System: "Chat",
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
  }
);
