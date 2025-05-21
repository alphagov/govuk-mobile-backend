import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { FeatureFlags } from './feature-flags';
import { FEATURE_FLAGS } from './feature-flags';
import type { AttestationUseCase} from './attestation';
import { validateAttestationHeaderOrThrow } from './attestation';
import type { ProxyInput } from './proxy';
import { proxy } from './proxy';
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
