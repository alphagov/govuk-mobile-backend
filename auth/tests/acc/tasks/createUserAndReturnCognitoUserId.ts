import { testConfig } from '../../common/config';
import { AttestationDriver } from '../../driver/attestation.driver';
import { AxiosAuthDriver } from '../../driver/axiosAuth.driver';
import { TestDataLoader } from '../../driver/testDataLoader.driver';
import { loginUserAndGetDecodedTokens } from './loginUserAndGetDecodedTokens';

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

const removeOneLoginPrefix = (username: string): string => {
  const oneLoginPrefix = 'onelogin_';
  if (username.startsWith(oneLoginPrefix)) {
    return username.slice(oneLoginPrefix.length);
  }
  return username;
};

export const createUserAndReturnCognitoUserId = async () => {
  const sharedSignalsUser = await testDataLoader.getSharedSignalsUser();

  const payload = await loginUserAndGetDecodedTokens(
    {
      attestationDriver,
      authDriver,
    },
    sharedSignalsUser,
  );
  const userId = (payload as any)['username'];
  return removeOneLoginPrefix(userId);
};
