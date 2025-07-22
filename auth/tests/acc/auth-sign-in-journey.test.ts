import { describe, it, expect, afterEach } from "vitest";
import { testConfig } from "../common/config";
import { TestDataLoader } from "../driver/testDataLoader.driver";
import { AxiosAuthDriver } from "../driver/axiosAuth.driver";

const COGNITO_APP_CLIENT_REDIRECT_URL = "https://d84l1y8p4kdic.cloudfront.net";

describe("auth sign in journey", () => {
  const testDataLoader = new TestDataLoader(testConfig.region, testConfig.configStackName);
  const authDriver = new AxiosAuthDriver(
    testConfig.clientId,
    testConfig.cognitoUrl,
    COGNITO_APP_CLIENT_REDIRECT_URL,
    testConfig.authProxyUrl,
    testConfig.oneLoginEnvironment
  );

  afterEach(() => {
    authDriver.clearCookies();
  });

  it("should sign the app into cognito using one login as the idp", async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const {
      status,
      access_token,
      id_token,
      refresh_token,
      expires_in,
      token_type,
    } = await authDriver.exchangeCodeForTokens({
      attestationHeader: "",
      code,
      code_verifier,
    });

    expect(status).toEqual(200);
    expect(id_token).toBeTruthy();
    expect(access_token).toBeTruthy();
    expect(refresh_token).toBeTruthy();
    expect(expires_in).toEqual(300);
    expect(token_type).toEqual("Bearer");
  });

  it('should allow the app to refresh the access token', async () => {
    const user = await testDataLoader.getSuccessfulSignInUser();
    const { code, code_verifier } = await authDriver.loginAndGetCode(user);
    const {
      access_token: initialAccessToken,
      refresh_token,
    } = await authDriver.exchangeCodeForTokens({
      attestationHeader: "",
      code,
      code_verifier,
    });

    expect(refresh_token).toBeTruthy();

    const { access_token: refreshedAccessToken } =
      await authDriver.refreshAccessToken(refresh_token!);

    expect(refreshedAccessToken).toBeTruthy();
    expect(refreshedAccessToken).not.toEqual(initialAccessToken);
  });
});
