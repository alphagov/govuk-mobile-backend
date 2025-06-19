import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

let cachedClientSecret: string | null = null;

export const getClientSecret = async (
): Promise<string> => {
    const client = new SecretsManagerClient({ region: "eu-west-2" })
    if (cachedClientSecret != null) {
        console.log("Using cached client secret");
        return cachedClientSecret
    }
    const secretName = process.env['FIREBASE_SECRET_NAME'];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!secretName) {
        throw new Error("Secret name is not provided");
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString == null) {
        throw new Error("Secret string is empty");
    }
    cachedClientSecret = response.SecretString

    console.log("Fetched client secret");

    return cachedClientSecret;
};
