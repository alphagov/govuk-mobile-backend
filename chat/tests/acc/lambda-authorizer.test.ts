import { assert, describe, it } from 'vitest';
import { testConfig } from '../common/config';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
  IAMClient,
  GetRoleCommand,
  GetRolePolicyCommand,
} from '@aws-sdk/client-iam';

const lambdaClient = new LambdaClient({ region: 'eu-west-2' });
const functionCommand = new GetFunctionCommand({
  FunctionName: testConfig.chatAuthorizerFunctionName,
});

const iamClient = new IAMClient({ region: 'eu-west-2' });

const iamCommandForChatAuthorizerLambdaRole = new GetRoleCommand({
  RoleName: testConfig.chatAuthorizerFunctionIAMRoleName,
});

const iamCommandGetRolePolicy = new GetRolePolicyCommand({
  RoleName: testConfig.chatAuthorizerFunctionIAMRoleName,
  PolicyName: testConfig.chatAuthorizerFunctionIAMRolePolicyName,
});

describe('Check deployed Chat Authorizer Lambda', async () => {
  const response = await lambdaClient.send(functionCommand);
  const chatAuthorizerLambda = response.Configuration!;

  it('has the correct timeout', () => {
    assert.equal(chatAuthorizerLambda.Timeout, 60);
  });

  it('has the correct memory size', () => {
    assert.equal(chatAuthorizerLambda.MemorySize, 128);
  });

  it('has the correct tracing configuration', () => {
    assert.equal(chatAuthorizerLambda.TracingConfig?.Mode, 'PassThrough');
  });

  it('has the correct runtime', () => {
    assert.equal(chatAuthorizerLambda.Runtime, 'nodejs22.x');
  });

  it('has the correct handler', () => {
    assert.equal(chatAuthorizerLambda.Handler, 'app.lambdaHandler');
  });

  it('has the correct package type', () => {
    assert.equal(chatAuthorizerLambda.PackageType, 'Zip');
  });

  it('has the correct state', () => {
    assert.equal(chatAuthorizerLambda.State, 'Active');
  });

  it('has the correct ephemeral storage size', () => {
    assert.equal(chatAuthorizerLambda.EphemeralStorage?.Size, 512);
  });

  it('has the correct architecture', () => {
    assert.deepEqual(chatAuthorizerLambda.Architectures, ['x86_64']);
  });

  it('has the correct logging configuration', () => {
    assert.equal(chatAuthorizerLambda.LoggingConfig?.LogFormat, 'Text');
    assert.equal(
      chatAuthorizerLambda.LoggingConfig?.LogGroup,
      `/aws/lambda/${testConfig.chatAuthorizerFunctionName}`,
    );
  });
});

describe('Check deployed Chat Authorizer Lambda IAM Role', async () => {
  const roleResponse = await iamClient.send(
    iamCommandForChatAuthorizerLambdaRole,
  );
  const chatAuthorizerLambdaRole = roleResponse.Role!;

  const rolePolicyResponse = await iamClient.send(iamCommandGetRolePolicy);
  const chatAuthorizerLambdaRolePolicy = rolePolicyResponse.PolicyDocument!;

  it('has the correct assume role policy document', () => {
    assert.deepEqual(
      JSON.parse(
        decodeURIComponent(chatAuthorizerLambdaRole.AssumeRolePolicyDocument!),
      ),
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    );
  });

  it('has the correct role policy document', () => {
    assert.deepEqual(
      JSON.parse(decodeURIComponent(chatAuthorizerLambdaRolePolicy)),
      {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['secretsmanager:GetSecretValue'],
            Effect: 'Allow',
            Resource: `arn:aws:secretsmanager:eu-west-2:886436928181:secret:/${testConfig.configStackName}/chat/secrets-*`,
          },
          {
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            Effect: 'Allow',
            Resource: `arn:aws:logs:eu-west-2:${testConfig.awsAccountId}:log-group:/aws/lambda/${testConfig.stackName}-chat-proxy-authorizer:*`,
          },
        ],
      },
    );
  });
});
