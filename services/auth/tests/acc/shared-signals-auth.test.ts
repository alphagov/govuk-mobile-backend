import { describe, expect, it } from 'vitest';
import { ClientCredentialsDriver } from '../driver/client-credentials.driver';
import { testConfig } from '../common/config';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosError } from 'axios';
import { SharedSignalsDriver } from '../driver/shared-signals.driver';
import { createUserAndReturnCognitoUserId } from './tasks/createUserAndReturnCognitoUserId';

describe('shared-signal authentication', async () => {
  const clientCredentialsDriver = new ClientCredentialsDriver(
    `/${testConfig.configStackName}/shared-signal/secrets-config`,
    testConfig.cognitoUrl,
  );

  const sharedSignalsDriver = new SharedSignalsDriver(
    testConfig.sharedSignalEndpoint,
  );
  await sharedSignalsDriver.setPrivateKey();

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

    const response = await sharedSignalsDriver.sendSignalVerificationSignal({
      accessToken,
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(202);
  });
});
