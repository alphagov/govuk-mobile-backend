import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { testConfig } from '../common/config';
import { TestDataLoader } from '../driver/testDataLoader.driver';
import { AxiosAuthDriver } from '../driver/axiosAuth.driver';
import { AttestationDriver } from '../driver/attestation.driver';

describe('auth sign out journey', () => {
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

  beforeAll(async () => {
    await attestationDriver.build();
  });

  afterEach(() => {
    authDriver.clearCookies();
  });

  it('should revoke refresh token and not allow use of an existing refresh token', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );

    const { refresh_token } = await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken,
      code,
      code_verifier,
    });

    const { status, statusText } = await authDriver.revokeToken(refresh_token!);
    expect(status).toBe(200);
    expect(statusText).toBe('OK');

    await expect(
      authDriver.refreshAccessToken(refresh_token!, attestationToken),
    ).rejects.toThrow();
  });

  it.each([
    {
      refreshToken: '',
      statusCode: 400,
      statusText: 'Bad Request',
    },
    {
      refreshToken: 'invalid-refresh-token',
      statusCode: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  ])('should reject the request if the input is invalid', async (body) => {
    await expect(
      authDriver.revokeToken(body.refreshToken, body.headers),
    ).rejects.toThrow(
      new Error(`Failed to revoke refresh token: ${body.statusText}`),
    );
  });
});
