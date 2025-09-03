import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

const fetchFeatureFlag = async (flagName: string): Promise<boolean> => {
  const configStackName = process.env['CONFIG_STACK_NAME'];
  if (configStackName == null) {
    throw new Error('Missing Environment Variable: CONFIG_STACK_NAME');
  }
  const paramaterPath = `/${configStackName}/feature-flags/${flagName}`;
  const parameter = await getParameter(paramaterPath, { maxAge: 900 }); //Caching for 15 minutes
  if (parameter == null) {
    throw new Error(`Missing SSM Paramater at: ${paramaterPath}`);
  }
  return parameter.toLowerCase() === 'true';
};

export interface FeatureFlags {
  ATTESTATION: () => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const FEATURE_FLAGS: FeatureFlags = {
  ATTESTATION: async () => fetchFeatureFlag('attestation'),
};
