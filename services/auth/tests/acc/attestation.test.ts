import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { describe, it, expect, beforeAll } from 'vitest';
import { testConfig } from '../common/config';
import { AttestationDriver } from '../driver/attestation.driver';
import { TestDataLoader } from '../driver/testDataLoader.driver';
import { AxiosAuthDriver } from '../driver/axiosAuth.driver';
import { LoggingDriver } from '../driver/logging.driver';
import querystring from 'querystring';
import { TestLambdaDriver } from '../driver/testLambda.driver';

describe.skipIf(!testConfig.isLocalEnvironment)('attestation', async () => {
  describe('attestation proxy is a confidential client', () => {
    const secretsManagerClient = new SecretsManagerClient({
      region: testConfig.region,
    });

    it('retrieves shared signal credentials from Secrets Manager', async () => {
      const secretId = testConfig.cognitoSecretName;

      const getSecretCommand = new GetSecretValueCommand({
        SecretId: secretId,
      });
      const secretResponse = await secretsManagerClient.send(getSecretCommand);

      expect(secretResponse.SecretString).toBeDefined();

      const secretData = JSON.parse(secretResponse.SecretString as string);
      expect(secretData).toHaveProperty('client_secret');
    });
  });
});

describe.skipIf(!testConfig.attestationEnabled)('app attestation', () => {
  const testDataLoader = new TestDataLoader(
    testConfig.region,
    testConfig.configStackName,
  );
  const authDriver = new AxiosAuthDriver(
    testConfig.clientId,
    testConfig.cognitoUrl,
    testConfig.redirectUri,
    testConfig.authProxyUrl,
    testConfig.oneLoginEnvironment,
  );
  const attestationDriver = new AttestationDriver();
  const testLambdaDriver = new TestLambdaDriver();
  const loggingDriver = new LoggingDriver(testLambdaDriver);

  beforeAll(async () => {
    try {
      await attestationDriver.build();
    } catch (error) {
      console.error('Error during AttestationDriver build:', error);
      throw error;
    }
  });

  it('unsuccessful requests are logged', async () => {
    await authDriver.exchangeCodeForTokens({
      attestationHeader: 'invalid-header',
      code: 'invalid-code',
      code_verifier: 'invalid-code-verifier',
    });

    const logMessages = await loggingDriver.findLogMessageWithRetries({
      logGroupName: testConfig.authProxyLogGroup,
      searchString: 'ERROR',
      delayMs: 5000,
      startTime: new Date(Date.now() - 60 * 60 * 1000).getTime(),
    });

    expect(logMessages).toBeDefined();
  });

  it('valid attestation tokens are accepted', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    const { status } = await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken,
      code,
      code_verifier,
    });

    expect(status).toEqual(200);
  });

  it.each([
    ['invalid', 401],
    [
      'eyJraWQiOiJEX28wMGciLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjI5OTE5NjM2OTk3OTppb3M6ZDExODUyMzkyN2UxODFjMWUzZTAxZSIsImF1ZCI6WyJwcm9qZWN0c1wvMjk5MTk2MzY5OTc5IiwicHJvamVjdHNcL2dvdnVrLWFwcCJdLCJwcm92aWRlciI6ImN1c3RvbSIsImlzcyI6Imh0dHBzOlwvXC9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tXC8yOTkxOTYzNjk5NzkiLCJleHAiOjE3NDU4NTgxNzcsImlhdCI6MTc0NTg1NDU3NywianRpIjoieDJON1JjdVZGUkFoVzFNUUI3ZFM2Y2lsdmhpd19PeWhpSVFZdkdOb3ZrWSJ9.Dod8We-byeW6j0QA9qM54fjURTtVdB86Mglt7h1D4_uMbs-3DrYTJoFVlZh4hagDj3Oo2udFi7ZsP3yREl8fnyiBpRsVZcAUoe28_d9Qex0niibkhO2tYRu8aWwIGEUlZUuJRK8Xm-OgCtRDICb_QRNtPkR1jPesqM5xSViW8M59-jc1YB0Z1zg-Igt0eglpeWHbF-BFZTLQiaHd6DVpUSzlW6eJdyRLyV6K9mcSi5-AViHaaC0zHiF8Mt6SzLVBvwnezX1Tn8LRgDmzIWVT7ir8F9oRtNPYyxUyCGtD-JWEU0zA9MUtQwWJORsmVcEnI2RM6hwiQHAJQoJPOapQC89JHtPGAH2x6E02J4pewWR2FzbAVBUxOPyaLhgNiHwzhIWsD524Uh_4EtMBcpE-9TBW9XyiYBByRm1QY9ni4x3TC_K39xQx-76WI37C0pKQgGMhtRhCRWE8A5Tv6wUJtoOBYgP32PjRhLbn9xLc9mr2u5_NUN2MBN1aG8Yx6oNd', // pragma: allowlist-secret
      401,
    ],
  ])(
    'attestation tokens are verified',
    async (attestationHeader, expectedStatus) => {
      const { status } = await authDriver.exchangeCodeForTokens({
        attestationHeader,
        code: 'validcode',
        code_verifier: 'validcodeverifier',
      });
      expect(status).toEqual(expectedStatus);
    },
  );

  it.each([
    // missing attestation header
    [
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      {
        grant_type: 'authorization_code',
        client_id: testConfig.clientId,
        code: 'valid-code',
        redirect_uri: 'https://example.com/callback',
        code_verifier: 'valid-code-verifier',
        scope: 'email openid',
      },
    ],
    // missing content-type header
    [
      {
        'X-Attestation-Token': 'valid-attestation-token',
      },
      {
        grant_type: 'authorization_code',
        client_id: testConfig.clientId,
        code: 'valid-code',
        redirect_uri: 'https://example.com/callback',
        code_verifier: 'valid-code-verifier',
        scope: 'email openid',
      },
    ],
  ])('attestation requests are validated', async (headers, body) => {
    const response = await fetch(`${testConfig.authProxyUrl}oauth2/token`, {
      method: 'POST',
      headers,
      body: querystring.stringify(body),
    });

    expect(response.status).toEqual(400);
    expect(response.statusText).toContain('Bad Request');
  });

  it.each([
    {
      grant_type: 'authorization_code',
      client_id: testConfig.clientId,
      code: 'valid-code',
      redirect_uri: 'https://example.com/callback',
      code_verifier: 'valid-code-verifier',
      scope: 'email openid',
    },
  ])('should reject bad token input', async (body) => {
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    const response = await fetch(`${testConfig.authProxyUrl}oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Attestation-Token': attestationToken,
      },
      body: querystring.stringify(body),
    });

    expect(response.status).toEqual(400);
    expect(response.statusText).toContain('Bad Request');
  });

  it('should reject tokens from unknown apps', async () => {
    const attestationToken = await attestationDriver.getToken(
      testConfig.unknownAndroidAppId,
    );
    const response = await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken.token,
      code: 'valid-code',
      code_verifier: 'valid-code-verifier',
    });

    expect(response.status).toEqual(401);
    expect(response.statusText).toContain(
      '{"message":"Unknown app associated with attestation token"}',
    );
  });

  it('should log non 2xx cognito errors', async () => {
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken,
      code: 'valid-code',
      code_verifier: 'valid-code-verifier',
    });

    const response = await loggingDriver.findLogMessageWithRetries({
      logGroupName: testConfig.authProxyLogGroup,
      searchString: 'COGNITO_ERROR',
      delayMs: 5000,
      startTime: new Date(Date.now() - 60 * 60 * 1000).getTime(),
    });

    expect(response).toBeDefined();
  });
});
