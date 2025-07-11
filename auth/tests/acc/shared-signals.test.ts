import {
  GetMethodCommand,
  GetMethodCommandOutput,
  GetResourcesCommand,
  GetResourcesCommandOutput
} from "@aws-sdk/client-api-gateway";
import { expect, describe, it } from "vitest";
import { testConfig } from "../common/config";
import { TestLambdaDriver } from "../driver/testLambda.driver";

const driver = new TestLambdaDriver();

const command = new GetResourcesCommand({
  restApiId: testConfig.sharedSignalsApiId,
});

describe.skipIf(!testConfig.isLocalEnvironment)
  ("shared signals", async () => {
    describe("API Gateway", () => {
      it("should have a POST method associated with a Lambda function", async () => {
        let lambdaAttached = false;
        let lambdaArn: string | undefined;

        const response = await driver.performAction<GetResourcesCommandOutput>({
          action: "GetResourcesCommand",
          service: "APIGatewayClient",
          command
        });
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
            const methodInfoResponse = await driver.performAction<GetMethodCommandOutput>({
              action: "GetMethodCommand",
              service: "APIGatewayClient",
              command: methodInfoCommand
            });
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

        const response = await driver.performAction<GetResourcesCommandOutput>({
          action: "GetResourcesCommand",
          service: "APIGatewayClient",
          command
        });
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
            const methodInfoResponse = await driver.performAction<GetMethodCommandOutput>({
              action: "GetMethodCommand",
              service: "APIGatewayClient",
              command: methodInfoCommand
            });
            authorizerId = methodInfoResponse.authorizerId;
          }
        }
        expect(authorizerId).toBeDefined();
      });
    });
  });
