import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { FEATURE_FLAGS, FeatureFlags } from './feature-flags';
import { AttestationUseCase, validateAttestationHeaderOrThrow } from './attestation';
import { proxy, ProxyInput } from './proxy';
import { getClientSecret } from './secret';
import { createHandler } from './handler';

interface Dependencies {
  proxy: (input: ProxyInput) => Promise<APIGatewayProxyResultV2>
  attestationUseCase: AttestationUseCase
  featureFlags: FeatureFlags
  getClientSecret: () => Promise<string>
}

const attestationUseCase = {
  validateAttestationHeaderOrThrow
}

const dependencies: Dependencies = {
  proxy,
  attestationUseCase,
  featureFlags: FEATURE_FLAGS,
  getClientSecret
}

export const lambdaHandler = createHandler(dependencies);
