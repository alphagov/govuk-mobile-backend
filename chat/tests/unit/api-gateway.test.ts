import { describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Chat API Gateway Proxy", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources("AWS::ApiGateway::RestApi");
  resourceUnderTest = resource["ChatApiGateway"] as any;

  it("should have a name that includes the stack name", () => {
    expect(resourceUnderTest.Properties.Name).toEqual({
      "Fn::Sub": "${AWS::StackName}-chat-proxy",
    });
  });

  it("should have associated tags", () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: "Product",
        Value: "GOV.UK",
      },
      {
        Key: "Environment",
        Value: { Ref: "Environment" },
      },
      {
        Key: "System",
        Value: "Chat",
      },
    ]);
  });
});
describe("Chat API Gateway Resource", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources("AWS::ApiGateway::Resource");
  resourceUnderTest = resource["ChatApiGatewayResource"] as any;

  it("should have a parent resource", () => {
    expect(resourceUnderTest.Properties.ParentId).toEqual({
      "Fn::GetAtt": ["ChatApiGateway", "RootResourceId"],
    });
  });

  it("should have a path that includes the stack name", () => {
    expect(resourceUnderTest.Properties.PathPart).toEqual("{proxy+}");
  });
});

describe("Chat API Gateway Method", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };
  
  const resource = template.findResources("AWS::ApiGateway::Method");
  resourceUnderTest = resource["ChatApiGatewayMethod"] as any;

  it("should have a method that allows any HTTP method", () => {
    expect(resourceUnderTest.Properties.HttpMethod).toEqual("ANY");
  });

  it("should have a resource ID that matches the Chat API Gateway Resource", () => {
    expect(resourceUnderTest.Properties.ResourceId).toEqual({
      Ref: "ChatApiGatewayResource",
    });
  });
  it("should have a REST API ID that matches the Chat API Gateway", () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: "ChatApiGateway",
    });
  });
  it("should have an authorization type of NONE", () => {
    expect(resourceUnderTest.Properties.AuthorizationType).toEqual("NONE");
  });
  it("should have request parameters for the proxy path", () => {
    expect(resourceUnderTest.Properties.RequestParameters).toEqual({
      "method.request.path.proxy": true,
    });
  });
  it("should have an integration type of HTTP_PROXY", () => {
    expect(resourceUnderTest.Properties.Integration.Type).toEqual("HTTP_PROXY");
  });
  it("should have an integration HTTP method of ANY", () => {
    expect(
      resourceUnderTest.Properties.Integration.IntegrationHttpMethod
    ).toEqual("ANY");
  });
  it("should have an integration URI that points to the Chat API Gateway URL", () => {
    expect(resourceUnderTest.Properties.Integration.Uri).toEqual({
      "Fn::Sub": [
        "{{resolve:ssm:/${ConfigStackName}/chat/api-url}}/${proxy}",
        {
          proxy: "{proxy}",
        },
      ],
    });
  });
  it("should have request parameters for the proxy path", () => {
    expect(resourceUnderTest.Properties.Integration.RequestParameters).toEqual({
      "integration.request.path.proxy": "method.request.path.proxy",
    });
  });
});

describe("Chat API Gateway Deployment", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources("AWS::ApiGateway::Deployment");
  resourceUnderTest = resource["ChatApiGatewayDeployment"] as any;

  it("should have a REST API ID that matches the Chat API Gateway", () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: "ChatApiGateway",
    });
  });

  it("should have a stage name that matches the Environment", () => {
    expect(resourceUnderTest.Properties.StageName).toEqual({
      Ref: "Environment",
    });
  });
});
