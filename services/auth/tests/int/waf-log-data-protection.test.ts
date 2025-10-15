import { beforeAll, describe, expect, it } from 'vitest';
import { LoggingDriver } from '../../../../libs/test-utils/src/aws/logging.driver';
import { testConfig } from '../common/config';
import axios from 'axios';
import querystring from 'querystring';
import jsonwebtoken from 'jsonwebtoken';
import { TestLambdaDriver } from '../../../../libs/test-utils/src/aws/testLambda.driver';
import { sleep } from '../common/sleep';

const driver = new TestLambdaDriver({
  region: testConfig.region,
  functionName: testConfig.testLambdaFunctionName,
});

describe(
  'waf logging data protection policies',
  () => {
    const startTime = Date.now() - 1 * 60 * 1000;
    const loggingDriver = new LoggingDriver(driver);

    describe('attestation api', () => {
      let logMessages;

      const fakeJwt = jsonwebtoken.sign(
        {
          foo: 'bar',
        },
        'fake-signing-key',
      );

      const unmaskedBody = {
        grant_type: 'refresh_token',
        client_id: 'some-secure-id',
        refresh_token: fakeJwt,
        email: 'foo@bar.com',
        access_token: fakeJwt,
        id_token: fakeJwt,
        jwt: fakeJwt,
        secret: 'fake-secret', // pragma: allowlist-secret
        name: 'sensitive',
        address: 'more sensitive',
      };

      const randomId = crypto.randomUUID();
      const unmaskedHeaders = {
        'X-Attestation-Token': fakeJwt,
        Authorization: `Bearer ${fakeJwt}`,
      };

      beforeAll(async () => {
        await axios
          .post(
            `${testConfig.authProxyUrl}/oauth2/token`,
            querystring.stringify(unmaskedBody),
            {
              headers: {
                ...unmaskedHeaders,
                'Content-Type': 'application/x-www-form-urlencoded',
                test: randomId,
              },
            },
          )
          .catch((e) => console.log('error expected'));

        await sleep(5000);

        const message = await loggingDriver.findLogMessageWithRetries({
          logGroupName: testConfig.authProxyWafLogGroupName,
          searchString: randomId,
          startTime,
          delayMs: 5000,
        });

        logMessages = JSON.parse(message);
      });

      it('should generate logs when attestation service is called', async () => {
        expect(logMessages).toBeDefined();
      });

      describe('data protection', () => {
        it('should redact sensitive body information', () => {
          expect(logMessages.httpRequest.body).toBeUndefined();
        });

        it('should redact sensitive token related information in the headers', () => {
          expect(unmaskedHeaders['X-Attestation-Token']).not.toEqual(
            logMessages.httpRequest.headers.find(
              (h) => h.name === 'X-Attestation-Token',
            ).value,
          );
          expect(unmaskedHeaders.Authorization).not.toEqual(
            logMessages.httpRequest.headers.find(
              (h) => h.name === 'Authorization',
            ).value,
          );
        });
      });
    });

    describe.skipIf(!testConfig.isLocalEnvironment)('cognito', () => {
      let logMessages;

      const fakeJwt = jsonwebtoken.sign(
        {
          foo: 'bar',
        },
        'fake-signing-key',
      );

      const unmakedQueryParams = {
        response_type: 'code',
        client_id: 'some-secure-id',
        redirect_uri: 'some-domain.com',
        scope: 'email',
        email: 'foo@bar.com',
        access_token: fakeJwt,
        id_token: fakeJwt,
        jwt: fakeJwt,
        secret: 'fake-secret', // pragma: allowlist-secret
        name: 'sensitive',
        address: 'more sensitive',
      };

      const randomId = crypto.randomUUID();
      const unmaskedHeaders = {
        // cognito waf logs are lowercased
        authorization: `Bearer ${fakeJwt}`,
      };

      beforeAll(async () => {
        await axios
          .get(
            `https://${
              testConfig.cognitoUrl
            }/oauth2/authorize?${querystring.stringify(unmakedQueryParams)}`,
            {
              headers: {
                ...unmaskedHeaders,
                'Content-Type': 'application/x-www-form-urlencoded',
                test: randomId,
              },
            },
          )
          .catch((e) => console.log('error expected'));

        await sleep(5000);

        const message = await loggingDriver.findLogMessageWithRetries({
          logGroupName: testConfig.cognitoWafLogGroupName,
          searchString: 'authorize',
          startTime,
          delayMs: 4000,
        });

        logMessages = JSON.parse(message);
      });

      it('should generate logs when attestation service is called', async () => {
        expect(logMessages).toBeDefined();
      });

      describe('data protection', () => {
        it('should redact sensitive body information', () => {
          const parsedQuery = querystring.parse(logMessages.httpRequest.args);
          expect(parsedQuery.jwt).not.toEqual(unmakedQueryParams.jwt);
        });

        it('should redact sensitive token related information in the headers', () => {
          expect(unmaskedHeaders.authorization).not.toEqual(
            logMessages.httpRequest.headers.find(
              (h) => h.name === 'authorization',
            ).value,
          );
        });
      });
    });
  },
  {
    retry: 3,
  },
);
