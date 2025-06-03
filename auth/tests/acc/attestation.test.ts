import "dotenv/config";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { describe, it, expect } from "vitest";
import { testConfig } from "../common/config";

const REGION = process.env.CFN_AWS_REGION || "eu-west-2";

describe("attestation", async () => {
  describe("attestation proxy is a confidential client", () => {
    const secretsManagerClient = new SecretsManagerClient({ region: REGION });
  
    it("retrieves shared signal credentials from Secrets Manager", async () => {
      const secretId = testConfig.cognitoSecretName;
  
      const getSecretCommand = new GetSecretValueCommand({ SecretId: secretId });
      const secretResponse = await secretsManagerClient.send(getSecretCommand);
  
      expect(secretResponse.SecretString).toBeDefined();
  
      const secretData = JSON.parse(secretResponse.SecretString as string);
      expect(secretData).toHaveProperty("client_secret");
    });
  });
});