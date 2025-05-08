import "dotenv/config"

export const testConfig = {
    authProxyFunctionName: process.env.CFN_AuthProxyFunctionName,
    authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName,
}