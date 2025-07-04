import "dotenv/config";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { describe, it, expect, assert } from "vitest";
import { testConfig } from "../common/config";
import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  IAMClient,
  GetRoleCommand,
  GetRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { CloudWatchClient, DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { SNSClient, GetTopicAttributesCommand } from "@aws-sdk/client-sns";

const lambdaClient = new LambdaClient({ region: testConfig.region });
const functionCommand = new GetFunctionCommand({
  FunctionName: testConfig.authProxyFunctionName,
});

const iamClient = new IAMClient({ region: testConfig.region });

const iamCommandForAuthProxyLambdaRole = new GetRoleCommand({
  RoleName: testConfig.authProxyFunctionIAMRoleName,
});

const iamCommandGetRolePolicy = new GetRolePolicyCommand({
  RoleName: testConfig.authProxyFunctionIAMRoleName,
  PolicyName: testConfig.authProxyFunctionIAMRolePolicyName,
});


describe
  .skipIf(!testConfig.isLocalEnvironment)
  ("attestation", async () => {
    describe("attestation proxy is a confidential client", () => {
      const secretsManagerClient = new SecretsManagerClient({ region: testConfig.region });

      it("retrieves shared signal credentials from Secrets Manager", async () => {
        const secretId = testConfig.cognitoSecretName;

        const getSecretCommand = new GetSecretValueCommand({
          SecretId: secretId,
        });
        const secretResponse = await secretsManagerClient.send(getSecretCommand);

        expect(secretResponse.SecretString).toBeDefined();

        const secretData = JSON.parse(secretResponse.SecretString as string);
        expect(secretData).toHaveProperty("client_secret");
      });
    });

    describe("deployed lambda configuration", async () => {
      const response = await lambdaClient.send(functionCommand);
      const attestationLambda = response.Configuration!;

      it("has the correct timeout", () => {
        assert.equal(attestationLambda.Timeout, 60);
      });

      it("has the correct memory size", () => {
        assert.equal(attestationLambda.MemorySize, 128);
      });

      it("has the correct tracing configuration", () => {
        assert.equal(attestationLambda.TracingConfig?.Mode, "PassThrough");
      });

      it("has the correct runtime", () => {
        assert.equal(attestationLambda.Runtime, "nodejs22.x");
      });

      it("has the correct handler", () => {
        assert.equal(attestationLambda.Handler, "app.lambdaHandler");
      });

      it("has the correct package type", () => {
        assert.equal(attestationLambda.PackageType, "Zip");
      });

      it("has the correct state", () => {
        assert.equal(attestationLambda.State, "Active");
      });

      it("has the correct ephemeral storage size", () => {
        assert.equal(attestationLambda.EphemeralStorage?.Size, 512);
      });

      it("has the correct architecture", () => {
        assert.deepEqual(attestationLambda.Architectures, ["x86_64"]);
      });

      it("has the correct logging configuration", () => {
        assert.equal(attestationLambda.LoggingConfig?.LogFormat, "Text");
        assert.equal(
          attestationLambda.LoggingConfig?.LogGroup,
          `/aws/lambda/${testConfig.authProxyFunctionName}`
        );
      });

      it("has the correct environment variables", () => {
        expect(attestationLambda.Environment?.Variables).toBeDefined();
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "ENABLE_ATTESTATION"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "COGNITO_URL"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "FIREBASE_IOS_APP_ID"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "FIREBASE_ANDROID_APP_ID"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "FIREBASE_PROJECT_ID"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "FIREBASE_AUDIENCE"
        );
        expect(attestationLambda.Environment?.Variables).toHaveProperty(
          "COGNITO_SECRET_NAME"
        );
      });
    });

    describe("deployed auth proxy lambda IAM role", async () => {
      const roleResponse = await iamClient.send(iamCommandForAuthProxyLambdaRole);
      const authProxyLambdaRole = roleResponse.Role!;

      const rolePolicyResponse = await iamClient.send(iamCommandGetRolePolicy);
      const authProxyLambdaRolePolicy = rolePolicyResponse.PolicyDocument!;

      it("has the correct assume role policy document", () => {
        assert.deepEqual(
          JSON.parse(
            decodeURIComponent(authProxyLambdaRole.AssumeRolePolicyDocument!)
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
          JSON.parse(decodeURIComponent(authProxyLambdaRolePolicy)),
          {
            Version: "2012-10-17",
            Statement: [
              {
                Action: ["secretsmanager:GetSecretValue"],
                Effect: "Allow",
                Resource: `arn:aws:secretsmanager:eu-west-2:${testConfig.awsAccountId}:secret:/${testConfig.configStackName}/cognito/client-secret-*`,
              },
              {
                Action: ["ssm:GetParameter"],
                Effect: "Allow",
                Resource: `arn:aws:ssm:eu-west-2:${testConfig.awsAccountId}:parameter/${testConfig.configStackName}/cognito/custom-domain`,
              },
              {
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                ],
                Effect: "Allow",
                Resource: `arn:aws:logs:eu-west-2:${testConfig.awsAccountId}:log-group:/aws/lambda/${testConfig.stackName}-auth-proxy:*`,
              },
            ],
          }
        );
      });
    });

    describe("alarms", async () => {
      const cloudWatchClient = new CloudWatchClient({ region: testConfig.region });

      const alarms = await cloudWatchClient.send(
        new DescribeAlarmsCommand()
      );

      const attestationAlarms = alarms.MetricAlarms?.filter((ma) => ma.AlarmName?.includes("attestation"))

      const action = attestationAlarms[0].OKActions[0];

      describe("notifications", () => {
        const snsClient = new SNSClient({ region: testConfig.region });
        it('alarm topic should encrpyt messages', async () => {
          const topic = await snsClient.send(
            new GetTopicAttributesCommand({ TopicArn: action })
          );
          expect(topic.Attributes.KmsMasterKeyId).toBeDefined();
        });
      });

      it.each([
        'attestation-low-200-response-proportion',
        'attestation-low-completion',
        'attestation-lambda-error-rate',
      ])('generate a %s alarm to monitor attestation lambda', (alarmName) => {
        expect(attestationAlarms?.find((a) => a.AlarmName?.includes(alarmName))).toBeTruthy()
      })

      describe('low 200 response proportion alarm', () => {
        it('should be disabled', () => {
          const alarm = attestationAlarms?.find((a) => a.AlarmName?.includes("attestation-low-200-response"));

          expect(alarm?.ActionsEnabled).toBe(false)
        })
      })
    })
  });
