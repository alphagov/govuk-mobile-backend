import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { testConfig } from '../common/config';
import { TestDataLoader } from '../driver/testDataLoader.driver';
import { AxiosAuthDriver } from '../driver/axiosAuth.driver';
import { AttestationDriver } from '../driver/attestation.driver';

describe('auth sign in journey', () => {
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

  it('should sign the app into cognito using one login as the idp', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    const {
      status,
      access_token,
      id_token,
      refresh_token,
      expires_in,
      token_type,
    } = await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken,
      code,
      code_verifier,
    });

    expect(status).toEqual(200);
    expect(id_token).toBeTruthy();
    expect(access_token).toBeTruthy();
    expect(refresh_token).toBeTruthy();
    expect(expires_in).toEqual(300);
    expect(token_type).toEqual('Bearer');
  });

  it('should allow the app to refresh the access token', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );

    const { access_token: initialAccessToken, refresh_token } =
      await authDriver.exchangeCodeForTokens({
        attestationHeader: attestationToken,
        code,
        code_verifier,
      });

    expect(refresh_token).toBeTruthy();

    const { access_token: refreshedAccessToken } =
      await authDriver.refreshAccessToken(refresh_token!, attestationToken);

    expect(refreshedAccessToken).toBeTruthy();
    expect(refreshedAccessToken).not.toEqual(initialAccessToken);
  });

  it('should enforce pkce challenge', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code } = await authDriver.loginAndGetCode(user);
    const { token: attestationToken } = await attestationDriver.getToken(
      testConfig.firebaseIosAppId,
    );
    const { status } = await authDriver.exchangeCodeForTokens({
      attestationHeader: attestationToken,
      code,
      code_verifier: 'wrong-code_verifier',
    });
    expect(status).toEqual(400);
  });
});
