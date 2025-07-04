import {
  APIGatewayClient,
  GetRestApiCommand,
  GetResourceCommand,
  GetMethodCommand,
} from "@aws-sdk/client-api-gateway";
import { describe, expect, it } from "vitest";
import { testConfig } from "../common/config";

const client = new APIGatewayClient({ region: "eu-west-2" });

const restApiCommand = new GetRestApiCommand({
  restApiId: testConfig.chatApiGatewayId,
});

const resourceCommand = new GetResourceCommand({
  restApiId: testConfig.chatApiGatewayId,
  resourceId: testConfig.chatApiGatewayResourceId,
});

const methodCommand = new GetMethodCommand({
  restApiId: testConfig.chatApiGatewayId,
  resourceId: testConfig.chatApiGatewayResourceId,
  httpMethod: "ANY",
});

describe("Check deployed API Gateway", async () => {
  const response = await client.send(restApiCommand);
  it("should have the execute api endpoint enabled", () => {
    expect(response.disableExecuteApiEndpoint).toBe(false);
  });
});

describe("Check deployed API Gateway resource", async () => {
  const response = await client.send(resourceCommand);
  it("should have the correct resource path", () => {
    expect(response.path).toBe("/{proxy}");
  });
  it("should have the correct path part", () => {
    expect(response.pathPart).toBe("{proxy}");
  });
  it("should have the correct resource methods", () => {
    expect(response.resourceMethods).toEqual({
      ANY: {},
    });
  });
});

describe("Check deployed API Gateway method", async () => {
  const response = await client.send(methodCommand);
  it("should have requestParameters with method.request.path.proxy", () => {
    expect(response.requestParameters).toEqual({
      "method.request.path.proxy": true,
    });
  });
  it("should have authorizationType set to NONE", () => {
    expect(response.authorizationType).toBe("NONE");
  });
  it("should have methodIntegration defined", () => {
    expect(response.methodIntegration).toBeDefined();
  });
  it("should have empty cacheKeyParameters", () => {
    expect(response.methodIntegration!.cacheKeyParameters).toEqual([]);
  });
  it('should have connectionType set to "INTERNET"', () => {
    expect(response.methodIntegration!.connectionType).toBe("INTERNET");
  });
  it('should have httpMethod set to "ANY"', () => {
    expect(response.methodIntegration!.httpMethod).toBe("ANY");
  });
  it('should have passthroughBehavior set to "WHEN_NO_MATCH"', () => {
    expect(response.methodIntegration!.passthroughBehavior).toBe(
      "WHEN_NO_MATCH"
    );
  });
  it("should have correct requestParameters mapping", () => {
    expect(response.methodIntegration!.requestParameters).toEqual({
      "integration.request.path.proxy": "method.request.path.proxy",
    });
  });
  it("should have timeoutInMillis set to 29000", () => {
    expect(response.methodIntegration!.timeoutInMillis).toBe(29000);
  });
  it('should have type set to "HTTP_PROXY"', () => {
    expect(response.methodIntegration!.type).toBe("HTTP_PROXY");
  });
  it("should have uri containing {proxy}", () => {
    expect(response.methodIntegration!.uri).toContain("{proxy}");
  });
});
