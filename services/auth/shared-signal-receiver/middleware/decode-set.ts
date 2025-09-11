import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayEvent, Context } from 'aws-lambda';
import type { Dependencies } from '../app';
import type { JWTPayload } from 'jose';

export type DecodedSetContext = Context & {
  decodedJwt: JWTPayload;
};

export const decodeSetMiddleware = (
  dependencies: Dependencies,
): MiddlewareObj<APIGatewayEvent, unknown, Error, DecodedSetContext> => ({
  before: async (request): Promise<void> => {
    const { verifySETJwt, getConfig } = dependencies;
    const config = getConfig();
    const decodedJwt = await verifySETJwt({ jwt: request.event, config });
    request.context.decodedJwt = decodedJwt;
  },
});
