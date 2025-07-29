import { getConfig } from '../../config';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ConfigError } from '../../errors';
import { SSMService } from '../../service/ssm-service';

vi.mock('../../service/ssm-service', () => {
  return {
    SSMService: vi.fn().mockImplementation(() => {
      return {
        getParameterValue: vi.fn().mockResolvedValue('custom-domain'),
      };
    }),
  };
});

describe('getConfig', () => {
  const customDomain = 'custom-domain';
  const region = 'eu-west-2';
  const constructValidCognitoUrl = `https://${customDomain}.auth.${region}.amazoncognito.com`;

  beforeAll(() => {
    process.env = {
      ...process.env,
      FIREBASE_IOS_APP_ID: 'someval',
      FIREBASE_ANDROID_APP_ID: 'someval',
      COGNITO_URL: constructValidCognitoUrl,
      FIREBASE_PROJECT_ID: 'someval',
      FIREBASE_AUDIENCE: 'someval',
      REGION: region,
      COGNITO_CUSTOM_DOMAIN_SSM_NAME: 'custom-domain-ssm-name',
    };
  });

  it('should return the required environment variables', async () => {
    new SSMService(region); // Ensure SSMService is instantiated

    const response = await getConfig();

    expect(response.firebaseAndroidAppId).toBeDefined();
    expect(response.firebaseIosAppId).toBeDefined();
    expect(response.cognitoUrl).toBeDefined();
  });

  it.each([
    [
      'FIREBASE_IOS_APP_ID',
      'FIREBASE_IOS_APP_ID environment variable is required',
    ],
    [
      'FIREBASE_ANDROID_APP_ID',
      'FIREBASE_ANDROID_APP_ID environment variable is required',
    ],
    ['COGNITO_URL', 'COGNITO_URL environment variable is required'],
    [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PROJECT_ID environment variable is required',
    ],
    ['FIREBASE_AUDIENCE', 'FIREBASE_AUDIENCE environment variable is required'],
    ['COGNITO_CUSTOM_DOMAIN_SSM_NAME', 'custom domain config name is required'],
    ['REGION', 'REGION environment variable is required'],
  ])('should throw if variables are undefined', async (key, message) => {
    const originalEnv = { ...process.env };
    delete process.env[key];

    new SSMService(region); // Ensure SSMService is instantiated

    await expect(getConfig()).rejects.toThrow(new ConfigError(message));

    process.env = originalEnv;
  });

  it.each([['192.168.1.1'], ['http://example.auth.cognito.com'], ['']])(
    'should throw if cognito url is invalid',
    async (url) => {
      const expectedMessage = `Cognito URL is invalid ${url}`;
      const originalEnv = { ...process.env };
      process.env['COGNITO_URL'] = url;

      new SSMService(region); // Ensure SSMService is instantiated

      await expect(getConfig()).rejects.toThrow(
        new ConfigError(expectedMessage),
      );

      process.env = originalEnv;
    },
  );
});
