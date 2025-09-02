import 'dotenv/config';

const getTestConfig = () => {
  const requiredVars = [
    'CFN_AuthProxyFunctionName',
    'CFN_AuthProxyFunctionIAMRoleName',
    'CFN_AuthProxyFunctionIAMRolePolicyName',
    'CFN_UserPoolId',
    'CFN_AppUserPoolClientId',
    'TEST_ENVIRONMENT',
    'CFN_CognitoWafLogGroupName',
    'CFN_SharedSignalEndpoint',
    'CFN_SharedSignalReceiverLogGroupName',
    'CFN_SharedSignalApiId',
    'CFN_CloudWatchAlarmSignUpThrottlesName', // pragma: allowlist-secret
    'CFN_CloudWatchAlarmSignInThrottlesName',
    'CFN_CloudWatchAlarmTokenRefreshThrottlesName',
    'CFN_CloudWatchAlarmFederationThrottlesName',
    'CFN_CloudwatchAlarmAuthProxy4xxErrors',
    'CFN_CloudwatchAlarmAuthProxy5xxErrors',
    'CFN_CloudwatchAlarmAuthProxyLatencyErrors',
    'CFN_SlackSupportChannelConfigurationARN',
    'CFN_CognitoSecretName',
    'CFN_SharedSignalClientId',
    'CFN_AWSAccountId',
    'CFN_AuthProxyId',
    'CFN_AuthProxyLogGroupName',
    'CFN_StackName',
    'CFN_ConfigStackName',
    'CFN_UserPoolProviderUrl',
    'CFN_AttestationLowCompletionAlarmName',
    'CFN_AttestationLow200ResponseProportionAlarmName',
    'CFN_AttestationLambdaErrorRateAlarmName',
    'CFN_CloudWatchWafRateLimitingAlarmName', //WAF Rate limit alarm name
    'CFN_CognitoWebApplicationFirewall', //Cognito WAF
    'CFN_AuthProxyWaf', //WAF for Auth Proxy
    'CFN_AuthProxyWafAlarm',
    'CFN_AuthProxyWafLogGroupName',
    'CFN_CognitoUrl',
    'CFN_AttestationApiLogGroupName',
    'CFN_TestLambdaFunctionName',
    'CFN_SharedSignalAccessLogGroupName',
    'CFN_AttestationEnabled',
    'CFN_AttestationEnabled',
    'CFN_OneLoginEnvironment',
    'CFN_FirebaseIosAppId',
    'CFN_FirebaseAndroidAppId',
    'CFN_UnknownAndroidAppId',
    'CFN_SharedSignalAccessLogGroupName',
    'CFN_DeployedEnvironment',
    'CFN_SharedSignalWAFLogGroupName',
    'CFN_SharedSignalHealthCheckFunctionName',
    'CFN_SharedSignalHealthCheckFunctionLogGroupName',
    'CFN_SharedSignalReceiverFunctionName',
    'CFN_SharedSignalApiGatewayAlarm4xxErrors',
    'CFN_SharedSignalApiGatewayAlarm5xxErrors',
    'CFN_SharedSignalWafThrottlingAlarm',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    authProxyFunctionName: process.env.CFN_AuthProxyFunctionName!,
    authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName!,
    authProxyFunctionIAMRoleName: process.env.CFN_AuthProxyFunctionIAMRoleName!,
    authProxyFunctionIAMRolePolicyName:
      process.env.CFN_AuthProxyFunctionIAMRolePolicyName!,
    authProxyWafLogGroupName: process.env.CFN_AuthProxyWafLogGroupName!,
    attestationProxyApiLogGroupName:
      process.env.CFN_AttestationApiLogGroupName!,
    userPoolId: process.env.CFN_UserPoolId!,
    testEnvironment: process.env.TEST_ENVIRONMENT!,
    deployedEnvironment: process.env.CFN_DeployedEnvironment!,
    isLocalEnvironment: process.env.TEST_ENVIRONMENT === 'local',
    isSlowRunning: process.env.SLOW_RUNNING_TESTS === 'true',
    cognitoWafLogGroupName: process.env.CFN_CognitoWafLogGroupName!,
    sharedSignalEndpoint: process.env.CFN_SharedSignalEndpoint!,
    sharedSignalReceiverLogGroupName:
      process.env.CFN_SharedSignalReceiverLogGroupName!,
    sharedSignalApiId: process.env.CFN_SharedSignalApiId!,
    authProxyUrl: process.env.CFN_AuthProxyUrl!,
    attestationLowCompletionAlarmName:
      process.env.CFN_AttestationLowCompletionAlarmName!,
    attestationLow200ResponseProportionAlarmName:
      process.env.CFN_AttestationLow200ResponseProportionAlarmName!,
    attestationLambdaErrorRateAlarmName:
      process.env.CFN_AttestationLambdaErrorRateAlarmName!,
    chatConfigurationArn: process.env.CFN_SlackSupportChannelConfigurationARN!,
    clientId: process.env.CFN_AppUserPoolClientId!,
    cloudWatchAlarmSignUpThrottlesName:
      process.env.CFN_CloudWatchAlarmSignUpThrottlesName!,
    cloudWatchAlarmSignInThrottlesName:
      process.env.CFN_CloudWatchAlarmSignInThrottlesName!,
    cloudWatchAlarmTokenRefreshThrottlesName:
      process.env.CFN_CloudWatchAlarmTokenRefreshThrottlesName!,
    cloudWatchAlarmFederationThrottlesName:
      process.env.CFN_CloudWatchAlarmFederationThrottlesName!,
    cloudWatchAlarmAuthProxy4xxErrors:
      process.env.CFN_CloudwatchAlarmAuthProxy4xxErrors!,
    cloudWatchAlarmAuthProxy5xxErrors:
      process.env.CFN_CloudwatchAlarmAuthProxy5xxErrors!,
    cloudWatchAlarmAuthProxyLatencyErrors:
      process.env.CFN_CloudwatchAlarmAuthProxyLatencyErrors!,
    cognitoSecretName: process.env.CFN_CognitoSecretName!,
    authProxyId: process.env.CFN_AuthProxyId!,
    environment: process.env.TEST_ENVIRONMENT,
    region: process.env.CFN_AWS_REGION || 'eu-west-2',
    awsAccountId: process.env.CFN_AWSAccountId!,
    stackName: process.env.CFN_StackName!,
    configStackName: process.env.CFN_ConfigStackName!,
    sharedSignalClientId: process.env.CFN_SharedSignalClientId!,
    sharedSignalAccessLogGroupName:
      process.env.CFN_SharedSignalAccessLogGroupName!,
    userPoolProviderId: process.env.CFN_UserPoolProviderUrl!,
    sharedSignalReceiverFunctionName:
      process.env.CFN_SharedSignalReceiverFunctionName!,
    //WAF configurations
    cloudWatchWafRateLimitingAlarmName:
      process.env.CFN_CloudWatchWafRateLimitingAlarmName!,
    cognitoWebApplicationFirewall:
      process.env.CFN_CognitoWebApplicationFirewall!,
    authProxyWAF: process.env.CFN_AuthProxyWaf!,
    authProxyWAFAlarm: process.env.CFN_AuthProxyWafAlarm!,
    cognitoUrl: process.env.CFN_CognitoUrl!,
    testLambdaFunctionName: process.env.CFN_TestLambdaFunctionName!,
    oneLoginEnvironment: process.env.CFN_OneLoginEnvironment!,
    firebaseIosAppId: process.env.CFN_FirebaseIosAppId!,
    firebaseAndroidAppId: process.env.CFN_FirebaseAndroidAppId!,
    unknownAndroidAppId: process.env.CFN_UnknownAndroidAppId!,
    redirectUri: 'https://d84l1y8p4kdic.cloudfront.net',
    attestationEnabled: process.env.CFN_AttestationEnabled == 'true',
    sharedSignalWAFLogGroupName: process.env.CFN_SharedSignalWAFLogGroupName!,
    sharedSignalHealthCheckFunctionName:
      process.env.CFN_SharedSignalHealthCheckFunctionName!,
    sharedSignalHealthCheckFunctionLogGroupName:
      process.env.CFN_SharedSignalHealthCheckFunctionLogGroupName!,
    sharedSignalApiGatewayAlarm4xxErrors:
      process.env.CFN_SharedSignalApiGatewayAlarm4xxErrors!,
    sharedSignalApiGatewayAlarm5xxErrors:
      process.env.CFN_SharedSignalApiGatewayAlarm5xxErrors!,
    sharedSignalWafThrottlingAlarm:
      process.env.CFN_SharedSignalWafThrottlingAlarm!,
  };
};

export const testConfig = getTestConfig();
