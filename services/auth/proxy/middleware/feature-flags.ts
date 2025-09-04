import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayEvent, Context } from 'aws-lambda';
import type { Dependencies } from '../app';

export type FeatureFlagsContext = Context & {
  isAttestationEnabled: boolean;
};

export const featureFlagsMiddleware = (
  dependencies: Dependencies,
): MiddlewareObj<APIGatewayEvent, unknown, Error, FeatureFlagsContext> => ({
  before: async (request): Promise<void> => {
    const { featureFlags } = dependencies;

    const isAttestationEnabled = await featureFlags.ATTESTATION();
    request.context.isAttestationEnabled = isAttestationEnabled;
  },
});
