import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ClientCredentialsDriver } from '../driver/client-credentials.driver';
import { testConfig } from '../common/config';
import { CognitoUserDriver } from '../driver/cognito-user.driver';
import { v4 as uuidv4 } from 'uuid';
import { TestLambdaDriver } from '../driver/testLambda.driver';
import { SharedSignalsDriver } from '../driver/shared-signals.driver';
import { generateKeyPair } from 'jose';
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';

describe('shared-signal-receiver', () => {
  const lambdaDriver = new TestLambdaDriver();
  const cognitoUserDriver = new CognitoUserDriver(
    testConfig.userPoolId,
    lambdaDriver,
  );
  const clientCredentialsDriver = new ClientCredentialsDriver(
    `/${testConfig.configStackName}/shared-signal/secrets-config`,
    testConfig.cognitoUrl,
  );
  const sharedSignalsDriver = new SharedSignalsDriver(
    testConfig.sharedSignalEndpoint,
  );

  describe('Given a shared signal event signed with a valid private key and access token', async () => {
    beforeAll(async () => {
      // Set a valid private key
      await sharedSignalsDriver.setPrivateKey();
    });

    // Generate an access token
    const accessToken = await clientCredentialsDriver.getAccessToken();

    const passwordUpdateUserId = uuidv4();
    const passwordUpdateUserName = `${passwordUpdateUserId}@passwordupdatetest.com`;
    const accountPurgeUserId = uuidv4();
    const accountPurgedUserName = `${accountPurgeUserId}@accountpurgedtest.com`;
    const emailUpdateUserId = uuidv4();
    const emailUpdateUserName = `${emailUpdateUserId}@emailupdatetest.com`;
    const emailAddressForUpdate = `${uuidv4()}@emailupdatedtest.com`;

    afterAll(async () => {
      await cognitoUserDriver.deleteUserFromCognito(passwordUpdateUserName);
      await cognitoUserDriver.deleteUserFromCognito(emailUpdateUserName);
    });

    it('sends a password update signal with a valid user and receives a 202 response', async () => {
      // Create a test user to send a signal for
      const cognitoUserId =
        await cognitoUserDriver.createCognitoUserAndReturnUserName(
          passwordUpdateUserName,
        );

      const response = await sharedSignalsDriver.sendPasswordSignal({
        userId: cognitoUserId,
        accessToken,
        email: passwordUpdateUserName,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(202);
    });

    it('sends a password update signal with an invalid user and receives a 202 ACCEPTED response', async () => {
      const response = await sharedSignalsDriver.sendPasswordSignal({
        userId: uuidv4(), //arbitrary user not found
        accessToken,
        email: 'test@test.com',
      });

      expect(response.ok).toBe(true); // The response is 202 because the user is not found, but the signal is still accepted
      expect(response.status).toBe(202);
    });

    it('sends a email update signal with an invalid user and receives a 202 ACCEPTED response', async () => {
      const response = await sharedSignalsDriver.sendEmailSignal({
        userId: uuidv4(), //arbitrary user not found
        accessToken,
        email: 'test@test.com',
      });

      expect(response.ok).toBe(true); // The response is 202 because the user is not found, but the signal is still accepted
      expect(response.status).toBe(202);
    });

    it('sends a email update signal with an unsupported change type and receives a 400 BAD REQUEST response', async () => {
      const response = await sharedSignalsDriver.sendEmailSignal({
        userId: 'foo',
        accessToken,
        email: 'test@test.com',
        changeType: 'CREATE', // unsupported change type
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: 'Bad Request' });
    });

    it('sends a  purge user signal with an invalid user and receives a 202 ACCEPTED response', async () => {
      const response = await sharedSignalsDriver.sendAccountPurgeSignal({
        userId: uuidv4(), //arbitrary user not found
        accessToken,
      });

      expect(response.ok).toBe(true); // The response is 202 because the user is not found, but the signal is still accepted
      expect(response.status).toBe(202);
    });

    it('sends an email update signal with a valid user and receives a 202 response', async () => {
      // Create a test user to send a signal for
      const cognitoUserId =
        await cognitoUserDriver.createCognitoUserAndReturnUserName(
          emailUpdateUserName,
        );

      const response = await sharedSignalsDriver.sendEmailSignal({
        userId: cognitoUserId,
        accessToken,
        email: emailAddressForUpdate,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(202);
    });

    it('sends an account purge signal with a valid user and receives a 202 response', async () => {
      const cognitoUserId =
        await cognitoUserDriver.createCognitoUserAndReturnUserName(
          accountPurgedUserName,
        );

      const response = await sharedSignalsDriver.sendAccountPurgeSignal({
        userId: cognitoUserId,
        accessToken,
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(202);
    });
  });

  describe('Given a shared signal event signed by an unknown private key', async () => {
    describe('When a signal is emitted', async () => {
      let response: Response;
      beforeAll(async () => {
        const accessToken = await clientCredentialsDriver.getAccessToken();
        const { privateKey } = await generateKeyPair('PS256');
        await sharedSignalsDriver.setPrivateKey(privateKey);
        response = await sharedSignalsDriver.sendEmailSignal({
          userId: 'foo',
          email: 'bar',
          accessToken,
        });
      });

      it('Returns a Bad Request response', async () => {
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ message: 'Bad Request' });
      });
    });
  });

  describe.each([{ iss: 'foobar' }, { typ: 'jwt' }, { aud: 'who-knows' }])(
    'Given a shared signal event with invalid claims',
    async (claim) => {
      beforeAll(async () => {
        await sharedSignalsDriver.setPrivateKey();
        sharedSignalsDriver.setJwtClaims(claim);
      });

      describe('When a signal is emitted', async () => {
        let response: Response;
        beforeAll(async () => {
          const accessToken = await clientCredentialsDriver.getAccessToken();
          response = await sharedSignalsDriver.sendEmailSignal({
            userId: 'foo',
            email: 'bar',
            accessToken,
          });
        });

        it('Returns a Bad Request response', async () => {
          expect(response.status).toBe(400);
          expect(await response.json()).toEqual({ message: 'Bad Request' });
        });
      });
    },
  );

  describe.runIf(testConfig.isLocalEnvironment)(
    'shared signal feature flag',
    async () => {
      const clientCredentialsDriver = new ClientCredentialsDriver(
        `/${testConfig.configStackName}/shared-signal/secrets-config`,
        testConfig.cognitoUrl,
      );
      const sharedSignalsDriver = new SharedSignalsDriver(
        testConfig.sharedSignalEndpoint,
      );

      // Generate an access token
      const accessToken = await clientCredentialsDriver.getAccessToken();

      let environmentVariables: Record<string, string>;

      beforeAll(async () => {
        const client = new LambdaClient({});
        let getCommand = new GetFunctionConfigurationCommand({
          FunctionName: testConfig.sharedSignalReceiverFunctionName,
        });

        let config: any;

        try {
          config = await client.send(getCommand);
        } catch (error) {
          console.error('error retrieving function configuration:', error);
          throw error;
        }

        environmentVariables = config.Environment?.Variables || {};

        const updateFunctionConfig = {
          FunctionName: testConfig.sharedSignalReceiverFunctionName,
          Environment: {
            Variables: {
              ...environmentVariables,
              ENABLE_SHARED_SIGNAL: 'false', // Disable shared signal feature
            },
          },
        };
        try {
          const updateLambdaCommand = new UpdateFunctionConfigurationCommand(
            updateFunctionConfig,
          );
          await client.send(updateLambdaCommand);
        } catch (error) {
          console.error('Error updating function configuration:', error);
          throw error; // Ensure the test fails if this fails
        }
        // Set a valid private key
        sharedSignalsDriver.setPrivateKey();

        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for the environment variable to be updated
      });

      afterAll(async () => {
        const config = {
          FunctionName: testConfig.sharedSignalReceiverFunctionName,
          Environment: {
            Variables: {
              ...environmentVariables,
              ENABLE_SHARED_SIGNAL: 'true', // enable shared signal feature
            },
          },
        };
        const client = new LambdaClient({});
        const command = new UpdateFunctionConfigurationCommand(config);
        try {
          await client.send(command);
        } catch (error) {
          console.error('Error resetting the function configuration:', error);
          throw error; // Ensure the test fails if this fails
        }
      });

      it('sends a password update signal with a shared signal disabled return 503', async () => {
        const response = await sharedSignalsDriver.sendPasswordSignal({
          userId: uuidv4(), //any arbitrary user
          accessToken,
          email: 'an@example.com',
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(503); // Expecting 503 Service Unavailable due to feature flag being off
      });

      it('sends a email update signal with a shared signal disabled return 503', async () => {
        const response = await sharedSignalsDriver.sendEmailSignal({
          userId: uuidv4(), //any arbitrary user
          accessToken,
          email: 'an@example.com',
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(503); // Expecting 503 Service Unavailable due to feature flag being off
      });

      it('sends a purge account signal with a shared signal disabled return 503', async () => {
        const response = await sharedSignalsDriver.sendAccountPurgeSignal({
          userId: uuidv4(), //any arbitrary user
          accessToken,
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(503); // Expecting 503 Service Unavailable due to feature flag being off
      });
    },
  );
});
