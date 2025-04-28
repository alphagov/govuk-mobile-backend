import { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
  assert, describe, it,
  beforeAll
} from "vitest";

const input = { 
  UserPoolId: process.env.CFN_UserPoolId,
  ClientId: process.env.CFN_AppUserPoolClientId,
};

describe("Check deployed Cognito User Pool Client", () => {
  let client;
  beforeAll(() => {
    client = new CognitoIdentityProviderClient({ region: "eu-west-2"});
  });
  it("has identity token expiration set correctly", async () => {
    const command = new DescribeUserPoolClientCommand(input);
    const response = await client.send(command);
    const expectedIdTokenValidity = 3600;
    assert.equal(response.UserPoolClient.IdTokenValidity, expectedIdTokenValidity);
  });
});
