import {
  APIGatewayClient,
  GetMethodCommand,
  GetResourcesCommand,
} from "@aws-sdk/client-api-gateway";
import { expect, describe, it } from "vitest";
import { testConfig } from "../common/config";

const client = new APIGatewayClient({
  region: "eu-west-2",
});

const command = new GetResourcesCommand({
  restApiId: testConfig.sharedSignalsApiId,
});

describe("shared signals", async () => {
  describe("API Gateway", () => {
    it("should have a POST method associated with a Lambda function", async () => {
      let lambdaAttached = false;
      let lambdaArn: string | undefined;

      const response = await client.send(command);
      const resources = response.items || [];

      for (const resource of resources) {
        const resourceId = resource.id;
        const methods = resource.resourceMethods || {};

        for (const method in methods) {
          const methodInfoCommand = new GetMethodCommand({
            restApiId: testConfig.sharedSignalsApiId,
            resourceId,
            httpMethod: method,
          });
          const methodInfoResponse = await client.send(methodInfoCommand);
          const integration = methodInfoResponse.methodIntegration;

          if (
            integration?.type === "AWS_PROXY" &&
            integration.uri?.includes("arn:aws:lambda")
          ) {
            lambdaAttached = true;
            lambdaArn = integration.uri.split(":invocation")[0];
          }
        }
      }
      expect(lambdaAttached).toBe(true);
      expect(lambdaArn).toBeDefined();
    });

    it("should have an Authorizer associated with the POST method", async () => {
      let authorizerId: string | undefined;

      const response = await client.send(command);
      const resources = response.items || [];

      for (const resource of resources) {
        const resourceId = resource.id;
        const methods = resource.resourceMethods || {};

        for (const method in methods) {
          const methodInfoCommand = new GetMethodCommand({
            restApiId: testConfig.sharedSignalsApiId,
            resourceId,
            httpMethod: method,
          });
          const methodInfoResponse = await client.send(methodInfoCommand);
          authorizerId = methodInfoResponse.authorizerId;
        }
      }
      expect(authorizerId).toBeDefined();
    });
  });
});
