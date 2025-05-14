import "dotenv/config"

export const testConfig = {
    authProxyFunctionName: process.env.CFN_AuthProxyFunctionName!,
    authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName!,
    userPoolId: process.env.CFN_UserPoolId!,
    clientId: process.env.CFN_AppUserPoolClientId!,
    testEnvironment: process.env.TEST_ENVIRONMENT!,
    cognitoWafLogGroupName: process.env.CFN_CognitoWafLogGroupName!,
    sharedSignalsEndpoint: process.env.CFN_SharedSignalsEndpoint!,
    sharedSignalsReceiverLogGroupName: process.env.CFN_SharedSignalsReceiverLogGroupName!,
    sharedSignalsApiId: process.env.CFN_SharedSignalsApiId!,
    postAuthenticationLambda: process.env.CFN_PostAuthenticationLambdaName!,
    PostAuthenticationFunctionInvokePermission: process.env.CFN_PostAuthenticationFunctionInvokePermission!,
}