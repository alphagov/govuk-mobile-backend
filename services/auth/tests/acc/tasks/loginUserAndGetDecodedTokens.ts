import { testConfig } from '../../common/config';
import { AttestationDriver } from '../../driver/attestation.driver';
import { AuthDriver } from '../../driver/auth.driver';
import jsonwebtoken from 'jsonwebtoken';
import { LoginUserInput } from '../../types/user';

export interface LoginUserDependencies {
  authDriver: AuthDriver;
  attestationDriver: AttestationDriver;
}

export const loginUserAndGetDecodedTokens = async (
  dependencies: LoginUserDependencies,
  user: LoginUserInput,
) => {
  const { authDriver, attestationDriver } = dependencies;

  await attestationDriver.build();

  const { code, code_verifier } = await authDriver.loginAndGetCode(user);

  const { token: attestationToken } = await attestationDriver.getToken(
    testConfig.firebaseIosAppId,
  );

  const { access_token } = await authDriver.exchangeCodeForTokens({
    attestationHeader: attestationToken,
    code,
    code_verifier,
  });

  const payload = jsonwebtoken.decode(access_token!);
  return payload;
};
