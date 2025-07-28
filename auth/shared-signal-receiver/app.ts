import type { VerifySetJwtInput } from './signature-verification/verify-signature';
import { verifySETJwt } from './signature-verification/verify-signature';
import type { Config } from './config';
import { getConfig } from './config';
import { createHandler } from './handler';
import { requestHandler } from './handlers/request-handler';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { JWTPayload } from 'jose';

const dependencies: Dependencies = {
  verifySETJwt,
  getConfig,
  requestHandler,
};

export interface Dependencies {
  verifySETJwt: (input: VerifySetJwtInput) => Promise<JWTPayload>;
  getConfig: () => Config;
  requestHandler: (jsonBody: object) => Promise<APIGatewayProxyResult>;
}

export const lambdaHandler = createHandler(dependencies);
