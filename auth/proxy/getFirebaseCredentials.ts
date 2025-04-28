import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "eu-west-2" });
let cachedServiceAccount: string | null = null;
const secretArn = process.env.FIREBASE_SECRET_ARN; // Set this in Lambda's environment variables

export const getFirebaseCredentials = async () => {
    if (cachedServiceAccount) {
        return cachedServiceAccount; // Reuse if already loaded
      }
    
      try {
        const command = new GetSecretValueCommand({ SecretId: secretArn });
        const response = await client.send(command);
    
        if (!response.SecretString) {
          throw new Error('No firebase service account found')
        } 
    
        cachedServiceAccount = JSON.parse(response.SecretString);
        return cachedServiceAccount;
      } catch (error) {
        console.error('Error retrieving secret:', error);
        throw error;
      }
}