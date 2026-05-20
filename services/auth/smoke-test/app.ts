import { randomBytes } from 'node:crypto';
import middy from '@middy/core';
// eslint-disable-next-line importPlugin/no-internal-modules
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
// eslint-disable-next-line importPlugin/no-internal-modules
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

import type { ServiceAccount } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
// eslint-disable-next-line importPlugin/no-internal-modules
import { getAppCheck } from 'firebase-admin/app-check';
import zod from 'zod/v4';
import { AxiosAuthDriver } from '../tests/driver/axiosAuth.driver';
import type { ScheduledEvent } from 'aws-lambda';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

const logger = new Logger({
  serviceName: process.env['POWERTOOLS_SERVICE_NAME'] ?? 'smoke-test',
});
const tracer = new Tracer();
const cloudwatch = new CloudWatchClient();

const metricNamespace = 'GOVUKMobileAuth';
const metricName = 'SmokeTestSuccess';
const metricDimensionName = 'Service';
const metricDimensionValue = 'Auth';
const smokeTestSuccessValue = Number(true);
const smokeTestFailureValue = Number(false);

const configSchema = zod.object({
  cognitoUrl: zod.string(),
  authProxyUrl: zod.string(),
  clientId: zod.string(),
  redirectUri: zod.string(),
  oneLoginDomain: zod.string(),
  userSecretName: zod.string(),
  firebaseSecretName: zod.string(),
  firebaseIosAppId: zod.string(),
});

const parsedConfig = configSchema.safeParse({
  cognitoUrl: process.env['COGNITO_URL'],
  authProxyUrl: process.env['AUTH_PROXY_URL'],
  clientId: process.env['CLIENT_ID'],
  redirectUri: process.env['REDIRECT_URI'],
  oneLoginDomain: process.env['ONE_LOGIN_DOMAIN'],
  userSecretName: process.env['USER_SECRET_NAME'],
  firebaseSecretName: process.env['FIREBASE_SECRET_NAME'],
  firebaseIosAppId: process.env['FIREBASE_IOS_APP_ID'],
});

if (!parsedConfig.success) {
  throw new Error(zod.prettifyError(parsedConfig.error));
}

const smokeTestConfig = parsedConfig.data;

let isFirebaseInitialized = false;

/**
 *
 */
async function ensureFirebaseInitialized(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  if (isFirebaseInitialized || getApps().length !== 0) {
    isFirebaseInitialized = true;
    return;
  }
  const serviceAccount = await getSecret(smokeTestConfig.firebaseSecretName, {
    transform: 'json',
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  initializeApp({ credential: cert(serviceAccount as ServiceAccount) });
  isFirebaseInitialized = true;
}

/**
 *
 */
async function getAttestationToken(): Promise<string> {
  await ensureFirebaseInitialized();
  const { token } = await getAppCheck().createToken(
    smokeTestConfig.firebaseIosAppId,
  );
  return token;
}

/**
 *
 * @param success
 */
async function emitMetric(success: boolean): Promise<void> {
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: metricNamespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: success ? smokeTestSuccessValue : smokeTestFailureValue,
          Unit: 'Count',
          Dimensions: [
            { Name: metricDimensionName, Value: metricDimensionValue },
          ],
        },
      ],
    }),
  );
}

/** Production smoke test: verifies sign-in and token refresh flows end-to-end. */
export const lambdaHandler = middy<ScheduledEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger))
  .handler(async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const runId = randomBytes(8).toString('hex');
    logger.info('smoke test started', { runId });

    try {
      const user = await getSecret(smokeTestConfig.userSecretName, {
        transform: 'json',
      });

      const attestationToken = await getAttestationToken();

      const authDriver = new AxiosAuthDriver(
        smokeTestConfig.clientId,
        smokeTestConfig.cognitoUrl,
        smokeTestConfig.redirectUri,
        smokeTestConfig.authProxyUrl,
        '',
        smokeTestConfig.oneLoginDomain,
      );

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const state = randomBytes(16).toString('hex');

      logger.info('smoke test step', { runId, step: 'sign-in' });
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { code, code_verifier, returnedState } =
        await authDriver.loginAndGetCode(user, state);

      if (returnedState !== state) {
        throw new Error(
          `State mismatch: expected ${state}, got ${String(returnedState)}`,
        );
      }

      logger.info('smoke test step', { runId, step: 'token-exchange' });
      const tokenResponse = await authDriver.exchangeCodeForTokens({
        code,
        code_verifier,
        attestationHeader: attestationToken,
      });

      if (typeof tokenResponse.access_token !== 'string') {
        throw new TypeError(
          `Token exchange failed: ${tokenResponse.status.toString()}`,
        );
      }
      if (typeof tokenResponse.refresh_token !== 'string') {
        throw new TypeError('Token exchange missing refresh_token');
      }

      logger.info('smoke test step', { runId, step: 'token-refresh' });
      const { access_token: refreshedAccessToken } =
        await authDriver.refreshAccessToken(
          tokenResponse.refresh_token,
          attestationToken,
        );

      if (refreshedAccessToken === tokenResponse.access_token) {
        throw new Error('Refreshed token matches original');
      }

      logger.info('smoke test result', { runId, status: 'pass' });
      await emitMetric(true);
    } catch (error) {
      logger.error('smoke test result', {
        runId,
        status: 'fail',
        error: String(error),
      });
      await emitMetric(false);
    }
  });
