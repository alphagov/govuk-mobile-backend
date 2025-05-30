import "dotenv/config";

export const testConfig = {
  authProxyFunctionName: process.env.CFN_AuthProxyFunctionName!,
  authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName!,
  userPoolId: process.env.CFN_UserPoolId!,
  clientId: process.env.CFN_AppUserPoolClientId!,
  testEnvironment: process.env.TEST_ENVIRONMENT!,
  cognitoWafLogGroupName: process.env.CFN_CognitoWafLogGroupName!,
  sharedSignalsEndpoint: process.env.CFN_SharedSignalsEndpoint!,
  sharedSignalsReceiverLogGroupName:
    process.env.CFN_SharedSignalsReceiverLogGroupName!,
  sharedSignalsApiId: process.env.CFN_SharedSignalsApiId!,
  postAuthenticationLambda: process.env.CFN_PostAuthenticationLambdaName!,
  PostAuthenticationFunctionInvokePermission:
    process.env.CFN_PostAuthenticationFunctionInvokePermission!,
  CloudWatchAlarmSignUpThrottlesName:
    process.env.CFN_CloudWatchAlarmSignUpThrottlesName!,
  CloudWatchAlarmSignInThrottlesName:
    process.env.CFN_CloudWatchAlarmSignInThrottlesName!,
  CloudWatchAlarmTokenRefreshThrottlesName:
    process.env.CFN_CloudWatchAlarmTokenRefreshThrottlesName!,
  CloudWatchAlarmFederationThrottlesName:
    process.env.CFN_CloudWatchAlarmFederationThrottlesName!,
  ChatConfigurationArn: process.env.CFN_ChatConfigurationArn!,
  authProxyUrl: process.env.CFN_AuthProxyUrl!,
};
