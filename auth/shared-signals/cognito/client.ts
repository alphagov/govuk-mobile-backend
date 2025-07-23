import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const region = process.env["REGION"];

if (region == undefined) {
  throw new Error("REGION environment variable is not set");
}
const cognitoClient = new CognitoIdentityProviderClient({ region });

export { cognitoClient };
