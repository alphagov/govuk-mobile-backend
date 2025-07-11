import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
    CognitoIdentityProviderClient, 
    DescribeUserPoolClientCommand, 
    RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns object - API Gateway Lambda Proxy Output Format
 */
// eslint-disable-next-line @typescript-eslint/require-await

interface CognitoCredentials {
    clientId: string;
    clientSecret: string; // Optional, as it may not be set for all clients
}

interface RevokeTokenInput {
    Token: string;
    ClientId: string;
    ClientSecret: string; // Optional, as it may not be set for all clients
}

const cognitoIdentityServiceProvider: CognitoIdentityProviderClient= new CognitoIdentityProviderClient({
            region: 'eu-west-2',
        });

const retrieveCognitoCredentials = async (config: {userPoolId: string, clientId: string})
    : Promise<CognitoCredentials> =>{
        const {userPoolId} = config;
        const sharedSignalClientId = config.clientId;

        if (!userPoolId || !sharedSignalClientId) {
            throw new Error('Missing required environment variables: CFN_UserPoolId or CFN_SharedSignalClientId');
        }

        try {
            const command = new DescribeUserPoolClientCommand({
                ClientId: sharedSignalClientId,
                UserPoolId: userPoolId,
            });

            const response = await cognitoIdentityServiceProvider.send(command);

            const clientId = response.UserPoolClient?.ClientId;
            const clientSecret = response.UserPoolClient?.ClientSecret; 

            if (!clientId) {
                throw new Error('Could not retrieve Cognito Client ID');
            }

            if (!clientSecret) {
                throw new Error('Could not retrieve Cognito Client Secret');
            }
            return { clientId, clientSecret };
             
        } catch (error) {
            console.error('Error fetching Cognito client credentials', error);
            throw error; // Re-throw to be handled by caller.
        }
    }   
    
 const revokeRefreshToken = async (input: RevokeTokenInput): Promise<APIGatewayProxyResult> => {
 
    const command = new RevokeTokenCommand(input);

    try {
        await cognitoIdentityServiceProvider.send(command);

        console.log('Refresh token revoked successfully.');
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Refresh token revoked successfully.' }),
        };
    } catch (error: any) { // Use 'any' for error type if specific AWS SDK error types are not imported/handled
        console.error('Error revoking token:', error);

        let errorMessage = 'Failed to revoke token.';
        // AWS SDK v3 errors have a 'name' property corresponding to the error code
        if (error.name === 'InvalidParameterException') {
            errorMessage = 'Invalid parameters provided to Cognito (e.g., token format or client ID).';
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = 'Not authorized to revoke this token (e.g., wrong client secret, token already revoked, or client ID mismatch).';
        } else if (error.name === 'TooManyRequestsException') {
            errorMessage = 'Too many requests to Cognito. Please try again later.';
        } else if (error.name === 'InternalErrorException') {
            errorMessage = 'An internal error occurred in Cognito. Please try again.';
        }

        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: errorMessage, errorDetails: error.message }),
        };
    }
    
 }   

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Revoke token request received", event);
    const refreshToken = event.body ? JSON.parse(event.body).refreshToken : null;
    const clientId = event.body? JSON.parse(event.body).clientId : null;

    if (!refreshToken) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Missing refresh token',
            }),
        };
    }

    if (!clientId) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Missing client ID',
            }),
        };
    }

    const userPoolId = process.env['COGNITO_USER_POOL_ID'];

    const clientCredentials: CognitoCredentials = await retrieveCognitoCredentials({
        userPoolId: userPoolId!,
        clientId: clientId as string
    });
    const revokeInput: RevokeTokenInput = {
        Token: refreshToken,
        ClientId: clientCredentials.clientId,
        ClientSecret: clientCredentials.clientSecret, 
    };

    return revokeRefreshToken(revokeInput);

};

