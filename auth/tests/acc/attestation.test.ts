import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { describe, it, expect } from "vitest";
import { testConfig } from "../common/config";


describe.skipIf(!testConfig.isLocalEnvironment)
    ("attestation", async () => {
        describe("attestation proxy is a confidential client", () => {
            const secretsManagerClient = new SecretsManagerClient({ region: testConfig.region });

            it("retrieves shared signal credentials from Secrets Manager", async () => {
                const secretId = testConfig.cognitoSecretName;

                const getSecretCommand = new GetSecretValueCommand({
                    SecretId: secretId,
                });
                const secretResponse = await secretsManagerClient.send(getSecretCommand);

                expect(secretResponse.SecretString).toBeDefined();

                const secretData = JSON.parse(secretResponse.SecretString as string);
                expect(secretData).toHaveProperty("client_secret");
            });
        });
    });