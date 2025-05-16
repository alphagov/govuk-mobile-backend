import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { FailedToFetchSecretError } from "./errors";

let cachedClientSecret: string | null = null;

export const getClientSecret = async (
    client: SecretsManagerClient = new SecretsManagerClient({ region: "eu-west-2" }),
    cachedClientSecretOverride: string | null = cachedClientSecret
): Promise<string> => {
    if (cachedClientSecretOverride) {
        console.log("Using cached client secret");
        return cachedClientSecretOverride
    }
    const secretName = process.env['COGNITO_SECRET_NAME']!;

    if (!secretName) {
        throw new FailedToFetchSecretError("Secret name is not provided");
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
        throw new FailedToFetchSecretError("SecretString is empty or undefined.");
    }

    const secret = JSON.parse(response.SecretString);
    const clientSecret = secret.client_secret;

    if(!clientSecret) {
        throw new FailedToFetchSecretError("client_secret is empty or undefined.");
    }

    cachedClientSecret = clientSecret;

    console.log("Fetched client secret");

    return clientSecret;
};
