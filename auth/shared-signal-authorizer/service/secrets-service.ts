import type { GetSecretValueCommandOutput } from "@aws-sdk/client-secrets-manager";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export interface SecretsConfig {
    clientId: string;
    clientSecret: string;
    userPoolId: string;
}

function parseSecretsConfig(config: string): SecretsConfig {
    const secretsConfig: SecretsConfig = JSON.parse(config);
    return secretsConfig;
}

export class SecretsService {
    private secretsManagerClient: SecretsManagerClient;

    public constructor() {
        this.secretsManagerClient = new SecretsManagerClient({region: "eu-west-2"});
    }

    public async getSecret(secretName: string): Promise<SecretsConfig | string | undefined> {
        try {
            const command = new GetSecretValueCommand({
                SecretId: secretName,
            });

            const data: GetSecretValueCommandOutput = await this.secretsManagerClient.send(command);
            
            if (data.SecretString !== undefined ) {
		return parseSecretsConfig(data.SecretString);
            } else if (data.SecretBinary) {
                // For example, to convert it to a UTF-8 string:
                // return Buffer.from(data.SecretBinary).toString('utf8');
                return data.SecretBinary.toString(); // Returns the Base64 string directly
            } else {
                console.warn(`Secret string or binary not found for: ${secretName}`);
                return undefined;
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === "ResourceNotFoundException") {
                    console.error(`Secret ${secretName} was not found.`);
                } else if (error.name === "InvalidRequestException") {
                    console.error(`Invalid request to Secrets Manager: ${error.message}`);
                } else if (error.name === "InvalidParameterException") {
                    console.error(`Invalid parameter for secret ${secretName}: ${error.message}`);
                } else {
                    console.error(`Error retrieving secret ${secretName}:`, error);
                }
            }
            
            return undefined;
        }
    }
}
