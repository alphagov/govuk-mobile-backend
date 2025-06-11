import { assert, describe, it } from "vitest";
import { testConfig } from "../common/config";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  IAMClient,
  GetRoleCommand,
  GetRolePolicyCommand,
} from "@aws-sdk/client-iam";

const lambdaClient = new LambdaClient({ region: "eu-west-2" });
const functionCommand = new GetFunctionCommand({
  FunctionName: testConfig.postAuthenticationLambda,
});

const iamClient = new IAMClient({ region: "eu-west-2" });

const iamCommandForPostAuthenticationLambdaRole = new GetRoleCommand({
  RoleName: testConfig.postAuthenticationFunctionIAMRoleName,
});

const iamCommandGetRolePolicy = new GetRolePolicyCommand({
  RoleName: testConfig.postAuthenticationFunctionIAMRoleName,
  PolicyName: testConfig.postAuthenticationFunctionIAMRolePolicyName,
});

describe("Check deployed Post Authentication Lambda", async () => {
  const response = await lambdaClient.send(functionCommand);
  const postAuthenticationLambda = response.Configuration!;

  it("has the correct timeout", () => {
    assert.equal(postAuthenticationLambda.Timeout, 60);
  });

  it("has the correct memory size", () => {
    assert.equal(postAuthenticationLambda.MemorySize, 128);
  });

  it("has the correct tracing configuration", () => {
    assert.equal(postAuthenticationLambda.TracingConfig?.Mode, "PassThrough");
  });

  it("has the correct runtime", () => {
    assert.equal(postAuthenticationLambda.Runtime, "nodejs22.x");
  });

  it("has the correct handler", () => {
    assert.equal(postAuthenticationLambda.Handler, "app.lambdaHandler");
  });

  it("has the correct package type", () => {
    assert.equal(postAuthenticationLambda.PackageType, "Zip");
  });

  it("has the correct state", () => {
    assert.equal(postAuthenticationLambda.State, "Active");
  });

  it("has the correct ephemeral storage size", () => {
    assert.equal(postAuthenticationLambda.EphemeralStorage?.Size, 512);
  });

  it("has the correct architecture", () => {
    assert.deepEqual(postAuthenticationLambda.Architectures, ["x86_64"]);
  });

  it("has the correct logging configuration", () => {
    assert.equal(postAuthenticationLambda.LoggingConfig?.LogFormat, "Text");
    assert.equal(
      postAuthenticationLambda.LoggingConfig?.LogGroup,
      `/aws/lambda/${testConfig.postAuthenticationLambda}`
    );
  });
});

describe("Check deployed Post Authentication Lambda IAM Role", async () => {
  const roleResponse = await iamClient.send(
    iamCommandForPostAuthenticationLambdaRole
  );
  const postAuthenticationLambdaRole = roleResponse.Role!;

  const rolePolicyResponse = await iamClient.send(iamCommandGetRolePolicy);
  const postAuthenticationLambdaRolePolicy = rolePolicyResponse.PolicyDocument!;

  it("has the correct assume role policy document", () => {
    assert.deepEqual(
      JSON.parse(
        decodeURIComponent(
          postAuthenticationLambdaRole.AssumeRolePolicyDocument!
        )
      ),
      {
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
      }
    );
  });

  it("has the correct role policy document", () => {
    assert.deepEqual(
      JSON.parse(decodeURIComponent(postAuthenticationLambdaRolePolicy)),
      {
        Version: "2012-10-17",
        Statement: [
          {
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            Effect: "Allow",
            Resource: `arn:aws:logs:eu-west-2:${testConfig.awsAccountId}:log-group:/aws/lambda/${testConfig.stackName}-post-authentication-function:*`,
          },
        ],
      }
    );
  });
});
