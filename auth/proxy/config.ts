import { ConfigError } from './errors';
import dotenv from 'dotenv';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import zod from 'zod/v4';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const sixtyMinutes = 60 * 60 * 1000;

/**
 * Validates the Cognito URL against the expected format based on the region and domain name.
 * Throws a ConfigError if the URL does not match the expected format.
 * @param configName The name of the SSM parameter that contains the custom domain configuration.
 * @param cognitoUrl The Cognito URL to validate.
 * @param region AWS region.
 * @returns URL The validated Cognito URL as a URL object.
 */
const validateCognitoUrl = async (
  configName: string,
  cognitoUrl: string,
  region: string,
): Promise<URL> => {
  const domainName = await getParameter(configName, {
    maxAge: sixtyMinutes,
  });

  if (domainName == null) {
    throw new ConfigError(`No parameter for value: ${configName}`);
  }

  const expectedDomain = `https://${domainName}.auth.${region}.amazoncognito.com`;

  if (cognitoUrl !== expectedDomain) {
    throw new ConfigError(`Cognito URL is invalid ${cognitoUrl}`);
  }

  return new URL(cognitoUrl);
};

const schema = zod.object({
  firebaseIosAppId: zod.string(),
  firebaseAndroidAppId: zod.string(),
  cognitoUrl: zod.string(),
  projectId: zod.string(),
  audience: zod.string(),
  customDomainConfigName: zod.string(),
  awsRegion: zod.string(),
  cognitoSecretName: zod.string(),
});

type SchemaConfig = zod.infer<typeof schema>;

export type AppConfig = Omit<SchemaConfig, 'cognitoUrl'> & {
  cognitoUrl: URL;
};

/**
 * Retrieves the application configuration from environment variables.
 * Validates the required variables and returns an object containing the configuration.
 * @returns AppConfig The application configuration object.
 */
export async function getConfig(): Promise<AppConfig> {
  const { data, error } = await schema.safeParseAsync({
    firebaseIosAppId: process.env['FIREBASE_IOS_APP_ID'],
    firebaseAndroidAppId: process.env['FIREBASE_ANDROID_APP_ID'],
    cognitoUrl: process.env['COGNITO_URL'],
    projectId: process.env['FIREBASE_PROJECT_ID'],
    audience: process.env['FIREBASE_AUDIENCE'],
    customDomainConfigName: process.env['COGNITO_CUSTOM_DOMAIN_SSM_NAME'],
    awsRegion: process.env['REGION'],
    cognitoSecretName: process.env['COGNITO_SECRET_NAME'],
  });

  if (error) {
    throw new ConfigError(zod.prettifyError(error));
  }

  const sanitizedUrl = await validateCognitoUrl(
    data.customDomainConfigName,
    data.cognitoUrl,
    data.awsRegion,
  );

  return {
    ...data,
    cognitoUrl: sanitizedUrl,
  };
}
