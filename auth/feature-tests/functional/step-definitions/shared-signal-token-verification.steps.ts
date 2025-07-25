import { expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { CurlHelper } from '../helper/curl-helper';
import { Types, Config } from '../common';
import { CognitoCredentialRetriever } from '../helper/cognito-credential-retriever';

const feature = await loadFeature(
  'feature-tests/functional/features/shared-signal-token-verification.feature',
);

describeFeature(feature, async ({ Scenario }) => {
  let credentials: any;
  let authUrl: string;
  let output: Types.M2MToken;
  const retriever = new CognitoCredentialRetriever();

  Scenario(`Valid shared signal token`, ({ Given, When, Then, And }) => {
    Given(`a valid client ID and secret are provided`, async () => {
      credentials = await retriever.retrieveCognitoCredentials({
        userPoolId: Config.testConfig.userPoolId,
        clientId: Config.testConfig.sharedSignalCognitoClientId,
      });
    });

    When(`the token is generated`, async () => {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      const data = {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      };

      authUrl = `https://${Config.testConfig.cognitoDomain}.auth.${Config.testConfig.awsRegion}.amazoncognito.com`;
      const curlHelper = new CurlHelper(authUrl);

      const result: any = await curlHelper.post('/oauth2/token', data, headers);
      if (result?.data) {
        output = result.data;
      }
    });

    Then(`the token should be valid`, () => {
      expect(output.access_token).toBeDefined();
      expect(output.token_type).toEqual('Bearer');
      expect(output.expires_in).toBe(3600); // 1 hour
    });
    And(`the token should be a valid JWT`, () => {
      const tokenParts = output.access_token.split('.');
      expect(tokenParts.length).toBe(3); // JWT has 3 parts
      expect(tokenParts[0]).toBeDefined(); // Header
      expect(tokenParts[1]).toBeDefined(); // Payload
      expect(tokenParts[2]).toBeDefined(); // Signature
    });
  });

  Scenario(`Invalid shared signal token`, ({ Given, When, Then }) => {
    Given(`an invalid client ID and secret is provided`, async () => {
      credentials = {
        clientId: 'invalidClientId',
        clientSecret: 'invalid', //pragma: allowlist-secret
      };
    });

    When(`the token generation is attempted`, async () => {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      const data = {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      };

      authUrl = `https://${Config.testConfig.cognitoDomain}.auth.${Config.testConfig.awsRegion}.amazoncognito.com`;
      const curlHelper = new CurlHelper(authUrl);
      let result: any;

      try {
        result = await curlHelper.post('/oauth2/token', data, headers);
      } catch (error) {
        result = undefined;
      }

      output = result?.data ? result.data : undefined;
    });

    Then(`the token is not generated`, () => {
      expect(output).toBeUndefined();
    });
  });
});
