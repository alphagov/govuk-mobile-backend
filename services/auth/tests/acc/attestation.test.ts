import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { describe, it, expect, beforeAll } from 'vitest';
import { testConfig } from '../common/config';
import { AttestationDriver } from '../driver/attestation.driver';
import { TestDataLoader } from '../driver/testDataLoader.driver';
import { AxiosAuthDriver } from '../driver/axiosAuth.driver';
import { LoggingDriver } from '../../../../libs/test-utils/src/aws/logging.driver';
import querystring from 'querystring';
import { TestLambdaDriver } from '../../../../libs/test-utils/src/aws/testLambda.driver';

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
  const testLambdaDriver = new TestLambdaDriver({
    region: testConfig.region,
    functionName: testConfig.testLambdaFunctionName,
  });
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

  it('invalid attestation tokens are rejected', async () => {
    const { status } = await authDriver.exchangeCodeForTokens({
      attestationHeader: 'invalid',
      code: 'validcode',
      code_verifier: 'validcodeverifier',
    });
    expect(status).toEqual(401);
  });

  it('expired attestation tokens are rejected', async () => {
    // Generate a valid token and corrupt its signature to simulate an invalid/expired token
    const { token: validToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    // Corrupt the token signature (last part after the second dot)
    const parts = validToken.split('.');
    const corruptedToken = `${parts[0]}.${parts[1]}.${parts[2]}corrupted`;

    const { status } = await authDriver.exchangeCodeForTokens({
      attestationHeader: corruptedToken,
      code: 'validcode',
      code_verifier: 'validcodeverifier',
    });
    expect(status).toEqual(401);
  });

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
