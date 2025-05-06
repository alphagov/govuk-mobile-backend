import { APIGatewayProxyResultV2, APIGatewayProxyEventV2, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { FEATURE_FLAGS, FeatureFlags } from './feature-flags';
import { AttestationUseCase, validateAttestationHeaderOrThrow } from './attestation';
import { proxy, ProxyInput } from './proxy';

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

const transformCognitoUrl = (url: string | undefined) => {
  return url?.toLowerCase().replace('_', '')
}

// removes stage i.e. dev/test/prod from the path to allow 
const stripStageFromPath = (stage: string, path: string): string => {
  if (path.startsWith(`/${stage}`)) {
    return path.slice(stage.length + 1);
  }
  return path
}

interface Dependencies {
  proxy: (input: ProxyInput) => Promise<APIGatewayProxyResultV2>
  attestationUseCase: AttestationUseCase
  featureFlags: FeatureFlags
}

export const createHandler = (dependencies: Dependencies) => async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const cognitoUrl = transformCognitoUrl(process.env.COGNITO_URL);

    if (!cognitoUrl) {
      throw new Error('Missing Cognito URL parameter')
    }

    const { headers, body, rawQueryString, requestContext } = event;

    console.log('Calling auth proxy')
    const { stage } = requestContext;
    const { method, path } = requestContext.http;

    const formattedPath = stripStageFromPath(stage, path);

    if (dependencies.featureFlags.ATTESTATION) {
      validateAttestationHeaderOrThrow(headers, requestContext.http.path)
    }

    const targetPath = formattedPath + (rawQueryString ? `?${rawQueryString}` : '');

    return await dependencies.proxy({
      method,
      path: formattedPath,
      isBase64Encoded: event.isBase64Encoded,
      body,
      sanitizedHeaders: sanitizeHeaders(headers),
      targetPath,
      // can throw invalid URL
      parsedUrl: new URL(cognitoUrl)
    })
  } catch (error) {
    console.error('Catchall error:', JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/x-amz-json-1.1' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

const attestationUseCase = {
  validateAttestationHeaderOrThrow
}

const dependencies = {
  proxy,
  attestationUseCase,
  featureFlags: FEATURE_FLAGS
}

export const lambdaHandler = createHandler(dependencies);
