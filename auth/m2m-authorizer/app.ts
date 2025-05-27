import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
    GetSecretValueCommandOutput,
  } from "@aws-sdk/client-secrets-manager";
import { SecretsConfig } from './types/auth-types';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const AWS_REGION = "eu-west-2"; 

const secretsManagerClient = new SecretsManagerClient({ region: AWS_REGION });

export const lambdaHandler = async (
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {  //APIGatewayAuthorizerResult
    console.log('Authorizer event:', JSON.stringify(event, null, 2));

    let token = event.authorizationToken; // The token is passed in the Authorization header

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
        let decoded = await getValidatedToken(token);
        if (!decoded) {
            console.error('Token validation failed');
            throw new Error('Unauthorized');
        }
        
        console.log('Token successfully validated:', decoded);

        return generatePolicy(decoded.sub, 'Allow', event.methodArn);

    } catch (error: any) {
        console.error('Token verification failed:', error.message);
        // Throwing an error here also results in a 401 Unauthorized response from API Gateway
        throw new Error('Unauthorized');
    }
};

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult => {
    const authResponse: APIGatewayAuthorizerResult = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
    };
    return authResponse;
};

const getValidatedToken = async (token: string): Promise< any | undefined> => {
    try {
        const secretsName = process.env['SHARED_SIGNAL_CLIENT_SECRET_NAME'];
        if (!secretsName) {
            throw new Error('Environment variable "SHARED_SIGNAL_CLIENT_SECRET_NAME" is not set');
        }
        const secretsObject = await getSecret(secretsName) as SecretsConfig; 

        console.log('Retrieved JWT secret:', secretsObject);
        
        if (!secretsObject) {
            throw new Error('Failed to retrieve JWT secret from Secrets Manager');
        }

        console.log('Validating token with secret:', secretsObject.clientSecret);

        const jwtVerifier = CognitoJwtVerifier.create({
          userPoolId: secretsObject.userPoolId, // The user pool ID from the secret
          tokenUse: "access", // "id" for ID tokens, "access" for Access tokens
          clientId: secretsObject.clientId, // The client ID from the secret
        });
        
        return jwtVerifier.verify(token, secretsObject.clientSecret);  
        
    } catch (error) {
        console.error('Token validation failed:', error);

        return undefined;
    }
}

async function getSecret(secretName: string): Promise<SecretsConfig | string | undefined> {
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