import { ConfigError } from './errors';
import dotenv from 'dotenv';
import { SSMService } from './service/ssm-service';

dotenv.config();

const region = process.env['REGION'] ?? 'eu-west-2';

const ssmServiceObject: SSMService = new SSMService(region);

/**
 * Validates the Cognito URL against the expected format based on the region and domain name.
 * Throws a ConfigError if the URL does not match the expected format.
 * @param configName The name of the SSM parameter that contains the custom domain configuration.
 * @param cognitoUrl The Cognito URL to validate.
 * @returns URL The validated Cognito URL as a URL object.
 */
const validateCognitoUrl = async (
  configName: string,
  cognitoUrl: string,
): Promise<URL> => {
  const domainName = await ssmServiceObject.getParameterValue(configName);

  const expectedDomain = `https://${domainName}.auth.${region}.amazoncognito.com`;

  if (cognitoUrl !== expectedDomain) {
    throw new ConfigError(`Cognito URL is invalid ${cognitoUrl}`);
  }

  return new URL(cognitoUrl);
};

/**
 * Retrieves the application configuration from environment variables.
 * Validates the required variables and returns an object containing the configuration.
 * @returns AppConfig The application configuration object.
 */
export async function getConfig(): Promise<AppConfig> {
  const firebaseIosAppId = process.env['FIREBASE_IOS_APP_ID'];
  const firebaseAndroidAppId = process.env['FIREBASE_ANDROID_APP_ID'];
  const cognitoUrl = process.env['COGNITO_URL'];
  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const audience = process.env['FIREBASE_AUDIENCE'];
  const customDomainConfigName = process.env['COGNITO_CUSTOM_DOMAIN_SSM_NAME'];
  const awsRegion = process.env['REGION'];

  if (firebaseIosAppId == null) {
    throw new ConfigError(
      'FIREBASE_IOS_APP_ID environment variable is required',
    );
  }

  if (firebaseAndroidAppId == null) {
    throw new ConfigError(
      'FIREBASE_ANDROID_APP_ID environment variable is required',
    );
  }

  if (cognitoUrl == null) {
    throw new ConfigError('COGNITO_URL environment variable is required');
  }

  if (customDomainConfigName == null) {
    throw new ConfigError('custom domain config name is required');
  }

  if (awsRegion == null) {
    throw new ConfigError('REGION environment variable is required');
  }

  const sanitizedUrl = await validateCognitoUrl(
    customDomainConfigName,
    cognitoUrl,
  );

  if (projectId == null) {
    throw new ConfigError(
      'FIREBASE_PROJECT_ID environment variable is required',
    );
  }
  if (audience == null) {
    throw new ConfigError('FIREBASE_AUDIENCE environment variable is required');
  }

  return {
    firebaseIosAppId,
    firebaseAndroidAppId,
    cognitoUrl: sanitizedUrl,
    projectId,
    audience,
  };
}

export interface AppConfig {
  firebaseIosAppId: string;
  firebaseAndroidAppId: string;
  cognitoUrl: URL;
  projectId: string;
  audience: string;
}
