import "dotenv/config"

export const testConfig = {
    firebaseIosAppId: process.env.CFN_FirebaseIosAppId!,
    firebaseAndroidAppId: process.env.CFN_FirebaseAndroidAppId!,
    unknownAndroidAppId: process.env.CFN_UnknownAndroidAppId!,
    authProxyLogGroup: process.env.CFN_AuthProxyLogGroupName!,
    appClientId: process.env.CFN_AppClientId!,
    authUrl: process.env.CFN_CognitoUrl!,
    proxyUrl: process.env.CFN_AuthProxyUrl!,
    redirectUri: process.env.CFN_RedirectUri!,
}