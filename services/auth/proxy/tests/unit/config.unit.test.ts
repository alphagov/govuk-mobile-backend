import { getConfig } from '../../config';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { ConfigError } from '../../errors';

const getParameterMock = vi.fn().mockResolvedValue('custom-domain');

vi.mock('@aws-lambda-powertools/parameters/ssm', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@aws-lambda-powertools/parameters/ssm')
  >();
  return {
    ...originalModule,
    getParameter: vi.fn(() => getParameterMock()),
  };
});

describe('getConfig', () => {
  const customDomain = 'custom-domain';
  const region = 'eu-west-2';
  const constructValidCognitoUrl = `https://${customDomain}.auth.${region}.amazoncognito.com`;

  beforeEach(() => {
    process.env = {
      ...process.env,
      FIREBASE_IOS_APP_ID: 'someval',
      FIREBASE_ANDROID_APP_ID: 'someval',
      COGNITO_URL: constructValidCognitoUrl,
      FIREBASE_PROJECT_ID: 'someval',
      FIREBASE_AUDIENCE: 'someval',
      REGION: region,
      COGNITO_CUSTOM_DOMAIN_SSM_NAME: 'custom-domain-ssm-name',
      COGNITO_SECRET_NAME: 'super-safe', // pragma: allowlist-secret
    };
  });

  it('should return the required environment variables', async () => {
    const response = await getConfig();

    expect(response.firebaseAndroidAppId).toBeDefined();
    expect(response.firebaseIosAppId).toBeDefined();
    expect(response.cognitoUrl).toBeDefined();
  });

  it.each([
    [
      'FIREBASE_IOS_APP_ID',
      `✖ Invalid input: expected string, received undefined
  → at firebaseIosAppId`,
    ],
    [
      'FIREBASE_ANDROID_APP_ID',
      `✖ Invalid input: expected string, received undefined
  → at firebaseAndroidAppId`,
    ],
    [
      'COGNITO_URL',
      `✖ Invalid input: expected string, received undefined
  → at cognitoUrl`,
    ],
    [
      'FIREBASE_PROJECT_ID',
      `✖ Invalid input: expected string, received undefined
  → at projectId`,
    ],
    [
      'FIREBASE_AUDIENCE',
      `✖ Invalid input: expected string, received undefined
  → at audience`,
    ],
    [
      'COGNITO_CUSTOM_DOMAIN_SSM_NAME',
      `✖ Invalid input: expected string, received undefined
  → at customDomainConfigName`,
    ],
    [
      'REGION',
      `✖ Invalid input: expected string, received undefined
  → at awsRegion`,
    ],
  ])('should throw if variables are undefined', async (key, message) => {
    const originalEnv = { ...process.env };
    delete process.env[key];

    await expect(getConfig()).rejects.toThrow(new ConfigError(message));

    process.env = originalEnv;
  });

  it.each([['192.168.1.1'], ['http://example.auth.cognito.com'], ['']])(
    'should throw if cognito url is invalid',
    async (url) => {
      const expectedMessage = `Cognito URL is invalid ${url}`;
      const originalEnv = { ...process.env };
      process.env['COGNITO_URL'] = url;

      await expect(getConfig()).rejects.toThrow(
        new ConfigError(expectedMessage),
      );

      process.env = originalEnv;
    },
  );

  it('should throw an error if the domain ssm parameter is empty', async () => {
    getParameterMock.mockResolvedValue(undefined);
    await expect(getConfig()).rejects.toThrow(
      new ConfigError(`No parameter for value: custom-domain-ssm-name`),
    );
  });
});
