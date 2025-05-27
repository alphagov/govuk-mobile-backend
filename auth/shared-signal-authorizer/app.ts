import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import type { SecretsConfig } from './types/auth-types';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { SecretsService } from './service/secrets-service';

const secretsService = new SecretsService();

export const lambdaHandler = async (
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {  //APIGatewayAuthorizerResult

    let token = event.authorizationToken; // The token is passed in the Authorization header

    if (!token) {
        console.error('Authorization header missing');
        throw new Error('Unauthorized - Token not supplied'); // This will result in a 401 response from API Gateway
    }

    // Expecting "Bearer <token>"
    if (token.startsWith('Bearer ')) {
        const seven = 7; // Length of "Bearer "
        token = token.substring(seven);
    } else {
        console.error('Token format invalid: Not a Bearer token');
        throw new Error('Unauthorized');
    }

    try {
        const decoded = await getValidatedToken(token);
        if (!decoded) {
            console.error('Token validation failed');
            throw new Error('Token validation failed');
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
        const secretsObject = await secretsService.getSecret(secretsName) as SecretsConfig; 

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
        
        return await jwtVerifier.verify(token, secretsObject.clientSecret);  
        
    } catch (error) {
        console.error('Token validation failed:', error);

        return undefined;
    }
}

