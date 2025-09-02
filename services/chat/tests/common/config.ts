import 'dotenv/config';

const getTestConfig = () => {
  const requiredVars = [
    'CFN_AWSAccountId',
    'CFN_StackName',
    'CFN_ConfigStackName',
    'CFN_ChatApiGatewayUrl',
    'CFN_ChatApiGatewayId',
    'CFN_ChatApiGatewayResourceId',
    'CFN_ChatApiGatewayMethodId',
    'CFN_ChatApiGatewayAuthorizerId',
    'CFN_ChatApiGatewayDeploymentId',
    'CFN_ChatAuthorizerFunctionName',
    'CFN_ChatAuthorizerInvokePermissionId',
    'CFN_ChatAuthorizerFunctionIAMRoleName',
    'CFN_ChatAuthorizerFunctionIAMRolePolicyName',
    'CFN_ChatAuthorizerFunctionKMSKeyArn',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    environment: process.env.TEST_ENVIRONMENT,
    region: process.env.CFN_AWS_REGION || 'eu-west-2',
    awsAccountId: process.env.CFN_AWSAccountId!,
    stackName: process.env.CFN_StackName!,
    authStackName: process.env.CFN_AuthStackName!,
    acceptanceTestFunctionName: `${process.env.CFN_AuthStackName}-testing-function`,
    configStackName: process.env.CFN_ConfigStackName!,
    chatApiGatewayUrl: process.env.CFN_ChatApiGatewayUrl!,
    chatApiGatewayId: process.env.CFN_ChatApiGatewayId!,
    chatApiGatewayResourceId: process.env.CFN_ChatApiGatewayResourceId!,
    chatApiGatewayMethodId: process.env.CFN_ChatApiGatewayMethodId!,
    chatApiGatewayAuthorizerId: process.env.CFN_ChatApiGatewayAuthorizerId!,
    chatApiGatewayAccessLogGroupName:
      process.env.CFN_ChatApiGatewayAccessLogGroupName!,
    chatApiGatewayAccessLogGroupKMSKeyArn:
      process.env.CFN_ChatApiGatewayAccessLogGroupKMSKeyArn!,
    chatApiGatewayAccessLogGroupKMSKeyId:
      process.env.CFN_ChatApiGatewayAccessLogGroupKMSKeyId!,
    chatApiGatewayDeploymentId: process.env.CFN_ChatApiGatewayDeploymentId!,
    chatAuthorizerFunctionName: process.env.CFN_ChatAuthorizerFunctionName!,
    chatAuthorizerInvokePermissionId:
      process.env.CFN_ChatAuthorizerInvokePermissionId!,
    chatAuthorizerFunctionIAMRoleName:
      process.env.CFN_ChatAuthorizerFunctionIAMRoleName!,
    chatAuthorizerFunctionIAMRolePolicyName:
      process.env.CFN_ChatAuthorizerFunctionIAMRolePolicyName!,
    chatAuthorizerFunctionKMSKeyArn:
      process.env.CFN_ChatAuthorizerFunctionKMSKeyArn!,
  };
};

export const testConfig = getTestConfig();
