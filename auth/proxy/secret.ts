import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { FailedToFetchSecretError } from "./errors";

let cachedClientSecret: string | null = null;

const typeGuardParseSecret = (secret: string): { client_secret: string } => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedSecret = JSON.parse(secret);

        // Check if parsedSecret is an object and has a client_secret property of type string
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        if("client_secret" in parsedSecret && typeof parsedSecret === "object" && typeof (parsedSecret as { client_secret: unknown }).client_secret === "string") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            return parsedSecret as { client_secret: string };
        }
        throw new FailedToFetchSecretError("Invalid secret format");
    } catch (error) {
        console.error("Error parsing secret:", error);
        throw new FailedToFetchSecretError("Failed to parse secret.");
    }
};

export const getClientSecret = async (
    client: SecretsManagerClient = new SecretsManagerClient({ region: "eu-west-2" }),
    cachedClientSecretOverride: string | null = cachedClientSecret
): Promise<string> => {
    if (cachedClientSecretOverride !== null && cachedClientSecretOverride !== "") {
        console.log("Using cached client secret");
        return cachedClientSecretOverride;
    }
    const secretName = process.env['COGNITO_SECRET_NAME'];

    if (secretName === undefined || secretName === "") {
        throw new FailedToFetchSecretError("Secret name is not provided");
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!response.SecretString) {
        throw new FailedToFetchSecretError("SecretString is empty or undefined.");
    }

    const clientSecret = typeGuardParseSecret(response.SecretString).client_secret;

    if(!clientSecret) {
        throw new FailedToFetchSecretError("client_secret is empty or undefined.");
    }

    cachedClientSecret = clientSecret;

    console.log("Fetched client secret");

    return clientSecret;
};
