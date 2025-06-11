import "dotenv/config";
import { config } from "process";

const getTestConfig = () => {
  const requiredVars = [
    "CFN_AuthProxyFunctionName",
    "CFN_AuthProxyLogGroupName",
    "CFN_AuthProxyFunctionIAMRoleName",
    "CFN_AuthProxyFunctionIAMRolePolicyName",
    "CFN_UserPoolId",
    "CFN_AppUserPoolClientId",
    "TEST_ENVIRONMENT",
    "CFN_CognitoWafLogGroupName",
    "CFN_SharedSignalsEndpoint",
    "CFN_SharedSignalsReceiverLogGroupName",
    "CFN_SharedSignalsApiId",
    "CFN_PostAuthenticationFunctionName",
    "CFN_PostAuthenticationFunctionIAMRoleName",
    "CFN_PostAuthenticationFunctionIAMRolePolicyName",
    "CFN_CloudWatchAlarmSignUpThrottlesName", // pragma: allowlist-secret
    "CFN_CloudWatchAlarmSignInThrottlesName",
    "CFN_CloudWatchAlarmTokenRefreshThrottlesName",
    "CFN_CloudWatchAlarmFederationThrottlesName",
    "CFN_SlackSupportChannelConfigurationARN",
    "CFN_CognitoSecretName",
    "CFN_SharedSignalClientId",
    "CFN_PostAuthenticationFunctionName",
    "CFN_AWSAccountId",
    "CFN_AuthProxyFunctionName",
    "CFN_AuthProxyLogGroupName",
    "CFN_StackName",
    "CFN_ConfigStackName",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    authProxyFunctionName: process.env.CFN_AuthProxyFunctionName!,
    authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName!,
    authProxyFunctionIAMRoleName: process.env.CFN_AuthProxyFunctionIAMRoleName!,
    authProxyFunctionIAMRolePolicyName:
      process.env.CFN_AuthProxyFunctionIAMRolePolicyName!,
    userPoolId: process.env.CFN_UserPoolId!,
    clientId: process.env.CFN_AppUserPoolClientId!,
    testEnvironment: process.env.TEST_ENVIRONMENT!,
    cognitoWafLogGroupName: process.env.CFN_CognitoWafLogGroupName!,
    sharedSignalsEndpoint: process.env.CFN_SharedSignalsEndpoint!,
    sharedSignalsReceiverLogGroupName:
      process.env.CFN_SharedSignalsReceiverLogGroupName!,
    sharedSignalsApiId: process.env.CFN_SharedSignalsApiId!,
    postAuthenticationLambda: process.env.CFN_PostAuthenticationFunctionName!,
    postAuthenticationFunctionIAMRoleName:
      process.env.CFN_PostAuthenticationFunctionIAMRoleName!,
    postAuthenticationFunctionIAMRolePolicyName:
      process.env.CFN_PostAuthenticationFunctionIAMRolePolicyName!,
    cloudWatchAlarmSignUpThrottlesName:
      process.env.CFN_CloudWatchAlarmSignUpThrottlesName!,
    cloudWatchAlarmSignInThrottlesName:
      process.env.CFN_CloudWatchAlarmSignInThrottlesName!,
    cloudWatchAlarmTokenRefreshThrottlesName:
      process.env.CFN_CloudWatchAlarmTokenRefreshThrottlesName!,
    cloudWatchAlarmFederationThrottlesName:
      process.env.CFN_CloudWatchAlarmFederationThrottlesName!,
    chatConfigurationArn: process.env.CFN_SlackSupportChannelConfigurationARN!,
    cognitoSecretName: process.env.CFN_CognitoSecretName!,
    authProxyUrl: process.env.CFN_AuthProxyUrl!,
    awsAccountId: process.env.CFN_AWSAccountId!,
    stackName: process.env.CFN_StackName,
    configStackName: process.env.CFN_ConfigStackName,
  };
};

export const testConfig = getTestConfig();
