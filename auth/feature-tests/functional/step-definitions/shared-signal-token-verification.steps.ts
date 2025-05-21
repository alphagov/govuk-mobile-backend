import { expect } from 'vitest';
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CurlHelper } from '../helper/curl-helper';
import { Types, Config } from '../common';


const feature = await loadFeature(
    "feature-tests/functional/features/shared-signal-token-verification.feature"
);

describeFeature(feature, async ({ Scenario }) => {
    let credentials: any;
    let authUrl: string;
    let result: Types.M2MToken;
    
    Scenario( `Valid shared signal token`,
        ({ Given, When, Then }) => {

            Given(`a valid client ID and secret are provided`, async () => {
                credentials = await retrieveCognitoCreds();
                console.log('Credentials:', credentials);
            });

            When(`the token is generated`, async () => {
                // https://govukapp-integration.auth.eu-west-2.amazoncognito.com/oauth2/token
                const headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
                const data = {
                    grant_type: 'client_credentials',
                    client_id: credentials.clientId,
                    client_secret: credentials.clientSecret,
                };

                authUrl = `https://${Config.testConfig.cognitoDomain}.auth.${Config.testConfig.awsRegion}.amazoncognito.com`;
                const curlHelper = new CurlHelper(authUrl);
                
                result = await curlHelper.post('/oauth2/token', data, headers) as unknown as Types.M2MToken;
                console.log('result:', result);
            });

            Then(`the token should be valid`, () => {
                console.log('Token:', result.access_token);
                expect(result).toBeDefined();
            });
        }
    );
});

const retrieveCognitoCreds = async () => {

    const cognitoIdentityServiceProvider = new CognitoIdentityProviderClient({
        region: 'eu-west-2',
    });

    const userPoolId = Config.testConfig.userPoolId;
    const sharedSignalClientId = Config.testConfig.sharedSignalCognitoClientId;
    
    if(!userPoolId || !sharedSignalClientId) {
        throw new Error('Missing required environment variables: CFN_UserPoolId or CFN_SharedSignalClientId');
    }
    try {
        const command = new DescribeUserPoolClientCommand({
            ClientId: sharedSignalClientId, 
            UserPoolId: userPoolId,
        });

        const response = await cognitoIdentityServiceProvider.send(command);

        const clientId = response.UserPoolClient?.ClientId;
        const clientSecret = response.UserPoolClient?.ClientSecret; //  Potentially undefined

        if (!clientId) {
            throw new Error('Could not retrieve Cognito Client ID');
        }

        return { clientId, clientSecret };
    } catch (error) {
        console.error('Error fetching Cognito client credentials', error);
        throw error; // Re-throw to be handled by caller.
    }
}