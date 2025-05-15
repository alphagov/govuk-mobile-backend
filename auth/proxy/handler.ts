import { APIGatewayProxyResultV2, APIGatewayProxyEventV2, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { FeatureFlags } from './feature-flags';
import { AttestationUseCase } from './attestation';
import { ProxyInput } from './proxy';
import { FailedToFetchSecretError, MissingAttestationTokenError, UnknownAppError } from './errors';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// cognito expects consistent casing for header names e.g. x-amz-target
// host must be removed to avoid ssl hostname unrecognised errors
const sanitizeHeaders = (headers: APIGatewayProxyEventHeaders) => {
  return Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== 'host')
    .reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value || '';
      return acc;
    }, {});
}

// removes stage i.e. dev/test/prod from the path to allow 
const stripStageFromPath = (stage: string, path: string): string => {
  if (stage && path.startsWith(`/${stage}`)) {
    return path.slice(stage.length + 1);
  }
  return path
}

interface Dependencies {
  proxy: (input: ProxyInput) => Promise<APIGatewayProxyResultV2>
  attestationUseCase: AttestationUseCase
  featureFlags: FeatureFlags
  getClientSecret: () => Promise<string>
}

export const createHandler = (dependencies: Dependencies) => async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log('Calling auth proxy')
    const cognitoUrl = process.env["COGNITO_URL"];

    if (!cognitoUrl) {
      throw new Error('Missing Cognito URL parameter')
    }

    const { proxy, attestationUseCase, featureFlags, getClientSecret } = dependencies;

    const { headers, body, rawQueryString, requestContext } = event;

    const { stage } = requestContext;
    const { method, path } = requestContext.http;

    const formattedPath = stripStageFromPath(stage, path);

    if (featureFlags.ATTESTATION) {
      await attestationUseCase.validateAttestationHeaderOrThrow(headers, requestContext.http.path, process.env)
    }

    const targetPath = formattedPath + (rawQueryString ? `?${rawQueryString}` : '');

    return await proxy({
      method,
      path: formattedPath,
      isBase64Encoded: event.isBase64Encoded,
      body,
      sanitizedHeaders: sanitizeHeaders(headers),
      targetPath,
      // can throw invalid URL
      parsedUrl: new URL(cognitoUrl),
      clientSecret: await getClientSecret()
    })
  } catch (error) {
    console.error('Catchall error:', error);
    switch (true) {
      case error instanceof MissingAttestationTokenError:
        return generateErrorResponse({
          statusCode: 400,
          message: 'Attestation token is missing'
        });
      case error instanceof TokenExpiredError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Attestation token has expired'
        });
      case error instanceof JsonWebTokenError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Attestation token is invalid'
        });
      case error instanceof UnknownAppError:
        return generateErrorResponse({
          statusCode: 401,
          message: 'Unknown app associated with attestation token'
        });
      case error instanceof FailedToFetchSecretError:
        return generateErrorResponse({
          statusCode: 500,
          message: 'Internal server error, server missing key dependencies'
        });
      default:
        return generateErrorResponse({
          statusCode: 500,
          message: 'Internal server error'
        });
    }
  }
}

const generateErrorResponse = ({
  statusCode,
  message
}: {
  statusCode: number,
  message: string
}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/x-amz-json-1.1' },
  body: JSON.stringify({ message })
})
