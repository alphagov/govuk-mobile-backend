import { describe, expect, it } from 'vitest';
import { ClientCredentialsDriver } from '../driver/client-credentials.driver';
import { testConfig } from '../common/config';
import { CognitoUserDriver } from '../driver/cognito-user.driver';
import { v4 as uuidv4 } from 'uuid';
import { TestLambdaDriver } from '../driver/testLambda.driver';
import axios, { AxiosError } from 'axios';

describe('shared-signal authentication', () => {
  const lambdaDriver = new TestLambdaDriver();
  const cognitoUserDriver = new CognitoUserDriver(
    testConfig.userPoolId,
    lambdaDriver,
  );
  const clientCredentialsDriver = new ClientCredentialsDriver(
    `/${testConfig.configStackName}/shared-signal/secrets-config`,
    testConfig.cognitoUrl,
  );
  const passwordUpdateUserId = uuidv4();
  const passwordUpdateUserName = `${passwordUpdateUserId}@test.com`;

  it('reject unauthorized requests', async () => {
    const response = await fetch(
      `${testConfig.sharedSignalEndpoint}/receiver`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer `,
        },
      },
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it('should not generate an access token with invalid client credentials', async () => {
    const config = await clientCredentialsDriver.constructAxiosRequestConfig({
      clientId: 'invalid-client-id',
      clientSecret: 'invalid-client-secret', // pragma: allowlist-secret
      userPoolId: testConfig.userPoolId,
    });

    const errror = await axios(config).catch((error: AxiosError) => error);

    expect(errror.response?.status).toBe(400);
    expect(errror.response?.data).toEqual({
      error: 'invalid_client',
    });
  });

  it('should allow authenticated requests', async () => {
    const accessToken = await clientCredentialsDriver.getAccessToken();

    const cognitoUserId =
      await cognitoUserDriver.createCognitoUserAndReturnUserName(
        passwordUpdateUserName,
      );

    const response = await fetch(
      `${testConfig.sharedSignalEndpoint}/receiver`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          iss: 'https://identity.example.com',
          jti: '123e4567-e89b-12d3-a456-426614174000',
          iat: 1721126400,
          aud: 'https://service.example.gov.uk',
          events: {
            'https://schemas.openid.net/secevent/caep/event-type/credential-change':
              {
                change_type: 'update',
                credential_type: 'password',
                subject: {
                  uri: cognitoUserId,
                  format: 'urn:example:format:account-id',
                },
              },
            'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
              {
                email: passwordUpdateUserName,
              },
          },
        }),
      },
    );

    expect(response.ok).toBe(true);
    expect(response.status).toBe(202);
  });
});
