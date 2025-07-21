import { describe, it, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Lambda Authorizer IAM Role", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources("AWS::IAM::Role");
  resourceUnderTest = resource["ChatAuthorizerFunctionIAMRole"] as any;

  it("should have a role name that includes the stack name", () => {
    expect(resourceUnderTest.Properties.RoleName).toEqual({
      "Fn::Sub": "${AWS::StackName}-chat-proxy-authorizer-role",
    });
  });
  it("should have a trust policy for the lambda service", () => {
    expect(resourceUnderTest.Properties.AssumeRolePolicyDocument).toEqual({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    });
  });
  it("should have a policy that allows the lambda function to write logs and read the /chat/secrets secret", () => {
    expect(resourceUnderTest.Properties.Policies).toEqual([
      {
        PolicyName: "ChatAuthorizerFunctionPolicy",
        PolicyDocument: {
          Statement: [
            {
              Action: ["secretsmanager:GetSecretValue"],
              Effect: "Allow",
              Resource: {
                "Fn::Sub":
                  "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:/${ConfigStackName}/chat/secrets-*",
              },
            },
            {
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Sub":
                  "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-chat-proxy-authorizer:*",
              },
            },
          ],
          Version: "2012-10-17",
        },
      },
    ]);
  });
  it("should have a permissions boundary", () => {
    expect(resourceUnderTest.Properties.PermissionsBoundary).toEqual({
      "Fn::If": [
        "UsePermissionsBoundary",
        {
          Ref: "PermissionsBoundary",
        },
        {
          Ref: "AWS::NoValue",
        },
      ],
    });
  });
  it("has the required tags", () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: "Product",
        Value: "GOV.UK",
      },
      {
        Key: "Environment",
        Value: {
          Ref: "Environment",
        },
      },
      {
        Key: "System",
        Value: "Chat",
      },
    ]);
  });
});

describe("Lambda Authorizer Invoke Permissions", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources("AWS::Lambda::Permission");
  resourceUnderTest = resource["ChatAuthorizerInvokePermission"] as any;

  it("should refer to the chat authorizer function", () => {
    expect(resourceUnderTest.Properties.FunctionName).toEqual({
      Ref: "ChatAuthorizerFunction",
    });
  });

  it("should have a lambda invoke action", () => {
    expect(resourceUnderTest.Properties.Action).toEqual(
      "lambda:InvokeFunction"
    );
  });

  it("should have a principal for the api gateway", () => {
    expect(resourceUnderTest.Properties.Principal).toEqual(
      "apigateway.amazonaws.com"
    );
  });

  it("should have a source arn relating to the api gateway", () => {
    expect(resourceUnderTest.Properties.SourceArn).toEqual({
      "Fn::Sub":
        "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ChatApiGateway}/*",
    });
  });
});
