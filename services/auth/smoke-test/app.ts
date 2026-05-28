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

import type { Credential, GoogleOAuthAccessToken } from 'firebase-admin/app';
import { getApps, initializeApp } from 'firebase-admin/app';
// eslint-disable-next-line importPlugin/no-internal-modules
import { getAppCheck } from 'firebase-admin/app-check';
import { ExternalAccountClient } from 'google-auth-library';
import zod from 'zod/v4';
import { AxiosAuthDriver } from '../tests/driver/axiosAuth.driver';
import type { ScheduledEvent } from 'aws-lambda';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

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
  requireAttestation: zod.enum(['true', 'false']).default('true'),
  gcpCredentialConfigParam: zod.string().optional(),
  firebaseIosAppId: zod.string().optional(),
});

const parsedConfig = configSchema.safeParse({
  cognitoUrl: process.env['COGNITO_URL'],
  authProxyUrl: process.env['AUTH_PROXY_URL'],
  clientId: process.env['CLIENT_ID'],
  redirectUri: process.env['REDIRECT_URI'],
  oneLoginDomain: process.env['ONE_LOGIN_DOMAIN'],
  userSecretName: process.env['USER_SECRET_NAME'],
  requireAttestation: process.env['REQUIRE_ATTESTATION'],
  gcpCredentialConfigParam: process.env['GCP_CREDENTIAL_CONFIG_PARAM'],
  firebaseIosAppId: process.env['FIREBASE_IOS_APP_ID'],
});

const userSchema = zod.object({
  email: zod.string(),
  password: zod.string(),
  totpSecret: zod.string(),
});

const gcpCredentialConfigSchema = zod
  .object({
    audience: zod.string(),
    subject_token_type: zod.string(),
    service_account_email: zod.string().optional(),
  })
  .loose();

if (!parsedConfig.success) {
  throw new Error(zod.prettifyError(parsedConfig.error));
}

const smokeTestConfig = parsedConfig.data;

let isFirebaseInitialized = false;

async function ensureFirebaseInitialized(): Promise<void> {
  if (isFirebaseInitialized || getApps().length !== 0) {
    isFirebaseInitialized = true;
    return;
  }

  if (smokeTestConfig.gcpCredentialConfigParam === undefined) {
    throw new Error(
      'GCP_CREDENTIAL_CONFIG_PARAM is required when attestation is enabled',
    );
  }

  const configJson = await getParameter(
    smokeTestConfig.gcpCredentialConfigParam,
    {
      transform: 'json',
    },
  );

  const configParseResult = gcpCredentialConfigSchema.safeParse(configJson);
  if (!configParseResult.success) {
    throw new Error(
      `Invalid GCP credential config: ${zod.prettifyError(
        configParseResult.error,
      )}`,
    );
  }

  const config = configParseResult.data;

  const externalClient = ExternalAccountClient.fromJSON(config);
  if (externalClient === null) {
    throw new Error(
      'Invalid GCP Workload Identity Federation credential config',
    );
  }

  const { service_account_email: serviceAccountEmail } = config;
  if (serviceAccountEmail === undefined) {
    throw new Error('Service account email missing from credential config');
  }

  const projectId = serviceAccountEmail.split('@')[1]?.split('.')[0];

  if (projectId === undefined) {
    throw new Error(
      'Project ID could not be inferred from service account email',
    );
  }

  const credential: Credential = {
    getAccessToken: async (): Promise<GoogleOAuthAccessToken> => {
      const response = await externalClient.getAccessToken();
      if (response.token === null || response.token === undefined) {
        throw new Error('GCP access token exchange returned null');
      }
      return { access_token: response.token, expires_in: 3600 };
    },
  };

  initializeApp({
    credential,
    serviceAccountId: serviceAccountEmail,
    projectId,
  });
  isFirebaseInitialized = true;
}

async function getAttestationToken(): Promise<string> {
  await ensureFirebaseInitialized();
  if (smokeTestConfig.firebaseIosAppId === undefined) {
    throw new Error(
      'FIREBASE_IOS_APP_ID is required when attestation is enabled',
    );
  }
  const { token } = await getAppCheck().createToken(
    smokeTestConfig.firebaseIosAppId,
  );
  return token;
}

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
    const runId = randomBytes(8).toString('hex');
    logger.info('smoke test started', { runId });

    try {
      const user = await getSecret(smokeTestConfig.userSecretName, {
        transform: 'json',
      });

      const userParseResult = await userSchema.parseAsync(user);

      const attestationToken =
        smokeTestConfig.requireAttestation === 'true'
          ? await getAttestationToken()
          : '';

      const authDriver = new AxiosAuthDriver(
        smokeTestConfig.clientId,
        smokeTestConfig.cognitoUrl,
        smokeTestConfig.redirectUri,
        smokeTestConfig.authProxyUrl,
        '',
        smokeTestConfig.oneLoginDomain,
      );

      const state = randomBytes(16).toString('hex');

      logger.info('smoke test step', { runId, step: 'sign-in' });
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { code, code_verifier, returnedState } =
        await authDriver.loginAndGetCode(userParseResult, state);

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
