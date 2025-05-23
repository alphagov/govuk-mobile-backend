import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
    GetSecretValueCommandOutput,
  } from "@aws-sdk/client-secrets-manager";
import {JwtPayload} from "jsonwebtoken";

const audiences: Record<string, string> = {
    'Prod': 'https://govukapp.auth.eu-west-2.amazoncognito.com', 
    'Dev': 'https://dev-govukapp.auth.eu-west-2.amazoncognito.com',
    'integration': 'https://govukapp-integration.auth.eu-west-2.amazoncognito.com',
};

const AWS_REGION = "eu-west-2"; 

const secretsManagerClient = new SecretsManagerClient({ region: AWS_REGION });

export const handler = async (
    event: APIGatewayRequestAuthorizerEvent
): Promise<boolean> => {  //APIGatewayAuthorizerResult
    console.log('Authorizer event:', JSON.stringify(event, null, 2));

    let token = event.headers?.['Authorization'] || event.headers?.['authorization'];

    if (!token) {
        console.error('Authorization header missing');
        // Return 401 Unauthorized directly for missing token
        // In API Gateway, a `Deny` policy on its own will return 403 Forbidden.
        // To get a 401, you'd typically throw an error or configure it more precisely.
        // For custom authorizers, throwing an error is often the way to get 401.
        throw new Error('Unauthorized - Token not supplied'); // This will result in a 401 response from API Gateway
    }

    // Expecting "Bearer <token>"
    if (token.startsWith('Bearer ')) {
        token = token.substring(7);
    } else {
        console.error('Token format invalid: Not a Bearer token');
        throw new Error('Unauthorized');
    }

    try {
        // Verify the token
        // const decoded: any = jwt.verify(token, JWT_SECRET);
        // console.log('Token decoded:', decoded);
        // Check the issuer
        let decoded = await getValidatedToken(token);
        if (!decoded) {
            console.error('Token validation failed');
            throw new Error('Unauthorized');
        }   

        decoded = decoded as jwt.JwtPayload; // Cast to any to access properties
        const expectedIssuer = 'https://ssf.account.gov.uk/'; // Replace with your actual issuer
        if (decoded.iss !== expectedIssuer) {
            console.error(`Token issuer invalid: expected ${expectedIssuer}, got ${decoded.iss}`);
            throw new Error('Unauthorized');
        }
        const expectedAudience = audiences[process.env['AWS_ENV'] as string]; // Replace with your actual audience
        if(decoded.aud !== expectedAudience) {
            console.error(`Token audience invalid: expected ${expectedAudience}, got ${decoded.aud}`);
            throw new Error('Unauthorized');
        }
            

        // In a real scenario, you'd perform additional checks here:
        // - Check 'exp' (expiration) is handled by jwt.verify by default
        // - Check 'iss' (issuer)
        // - Check 'aud' (audience)
        // - Check user roles/permissions based on 'decoded' claims

        // If verification is successful, generate an Allow policy
        return true; //generatePolicy(decoded.userId || 'user', 'Allow', event.methodArn);

    } catch (error: any) {
        console.error('Token verification failed:', error.message);
        // Throwing an error here also results in a 401 Unauthorized response from API Gateway
        throw new Error('Unauthorized');
    }
};

// const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult => {
//     const authResponse: APIGatewayAuthorizerResult = {
//         principalId: principalId,
//         policyDocument: {
//             Version: '2012-10-17',
//             Statement: [
//                 {
//                     Action: 'execute-api:Invoke',
//                     Effect: effect,
//                     Resource: resource,
//                 },
//             ],
//         },
//     };
//     return authResponse;
// };

const getValidatedToken = async (token: string): Promise< string | JwtPayload | undefined> => {
    try {
        const secretsName = process.env['secrets_name'];
        if (!secretsName) {
            throw new Error('Environment variable "secrets_name" is not set');
        }
        const JWT_SECRET = await getSecret(secretsName); // Replace with your actual secret name
        
        if (!JWT_SECRET) {
            throw new Error('Failed to retrieve JWT secret from Secrets Manager');
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        
        return decoded;
    } catch (error) {
        console.error('Token validation failed:', error);

        return undefined;
    }
}

async function getSecret(secretName: string): Promise<string | undefined> {
    try {
      // Create a GetSecretValueCommand with the secret name.
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });
  
      // Send the command to Secrets Manager and await the response.
      const data: GetSecretValueCommandOutput = await secretsManagerClient.send(command);
  
      // Check if the secret string is present in the response.
      if (data.SecretString) {
        console.log(`Successfully retrieved secret string for: ${secretName}`);
        return data.SecretString;
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