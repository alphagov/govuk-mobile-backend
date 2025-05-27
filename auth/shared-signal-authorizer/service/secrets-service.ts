import {
    SecretsManagerClient,
    GetSecretValueCommand,
    GetSecretValueCommandOutput,
} from "@aws-sdk/client-secrets-manager";
import { SecretsConfig } from "../types/auth-types";

export class SecretsService {
    private secretsManagerClient: SecretsManagerClient;

    constructor() {
        this.secretsManagerClient = new SecretsManagerClient({region: "eu-west-2"});
    }

    public async getSecret(secretName: string): Promise<SecretsConfig | string | undefined> {
        try {
            // Create a GetSecretValueCommand with the secret name.
            const command = new GetSecretValueCommand({
                SecretId: secretName,
            });

            // Send the command to Secrets Manager and await the response.
            const data: GetSecretValueCommandOutput = await this.secretsManagerClient.send(command);

            // Check if the secret string is present in the response.
            if (data.SecretString) {
                console.log(`Successfully retrieved secret string for: ${secretName}`);
                return JSON.parse(data.SecretString) as SecretsConfig; // Assuming the secret is a JSON string, parse it
            } else if (data.SecretBinary) {
                // If the secret is binary, it's returned as a Base64-encoded string.
                // You might need to decode it based on your application's needs.
                console.log(`Successfully retrieved secret binary for: ${secretName}`);
                // For example, to convert it to a UTF-8 string:
                // return Buffer.from(data.SecretBinary).toString('utf8');
                return data.SecretBinary.toString(); // Returns the Base64 string directly
            } else {
                console.warn(`Secret string or binary not found for: ${secretName}`);
                return undefined;
            }
        } catch (error: any) {
            // Handle specific errors from Secrets Manager.
            if (error.name === "ResourceNotFoundException") {
                console.error(`Secret ${secretName} was not found.`);
            } else if (error.name === "InvalidRequestException") {
                console.error(`Invalid request to Secrets Manager: ${error.message}`);
            } else if (error.name === "InvalidParameterException") {
                console.error(`Invalid parameter for secret ${secretName}: ${error.message}`);
            } else {
                console.error(`Error retrieving secret ${secretName}:`, error);
            }
            return undefined;
        }
    }
}
