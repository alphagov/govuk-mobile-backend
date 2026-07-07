import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { lambdaHandler } from './app';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { clearCaches } from '@aws-lambda-powertools/parameters';
import { generateSecret, SignJWT } from 'jose';

/**
 * Validation
 * Env Vars missing
 * No EMAIL in JWT
 * Secret missing
 * Happy path
 */

//test data
const getApiGatewayEvent = (body: string) => {
  return {
    body,
    headers: {},
    multiValueHeaders: {},
    requestContext: {},
    httpMethod: 'POST',
    resource: 'resource',
    path: '/linking/verification',
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    stageVariables: null,
  } as APIGatewayProxyEvent;
};

const generateJwt = async (email?: string) => {
  const secretKey = await generateSecret('HS256');
  const payload = {
    sub: 'abc',
    ...(email ? { email: email } : {}),
  };
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);
};

const mockContext = {
  awsRequestId: 'foobar',
} as Context;

const testParamName = 'TEST_SECRET_NAME_123';

//mocks
vi.mock('@aws-lambda-powertools/parameters/secrets', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@aws-lambda-powertools/parameters/secrets')
  >();
  return {
    ...originalModule,
    getSecret: vi.fn().mockResolvedValue(
      JSON.stringify({
        client_secret: 'mock-client-secret', // pragma: allowlist-secret
      }),
    ),
  };
});

describe('GIVEN the Linking Verification Handler is invoked', () => {
  beforeEach(() => {
    vi.stubEnv('HASH_KEY_SECRET_NAME', testParamName);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCaches();
  });

  it('WHEN the payload is invalid THEN an error is returned', async () => {
    const event = getApiGatewayEvent(JSON.stringify({ token: 123 }));
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(response.body).message).toBe('Invalid request body');
  });

  it('WHEN the environment variable is not valid THEN an error is returned', async () => {
    vi.stubEnv('HASH_KEY_SECRET_NAME', undefined);
    const event = getApiGatewayEvent(JSON.stringify({ token: 'abc' }));
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe(
      'Invalid environment variables',
    );
  });

  it('WHEN the jwt lacks an email THEN an error is returned', async () => {
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt() }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('No valid email in token');
  });

  it('WHEN the hash secret fails to fetch THEN an error is returned', async () => {
    (getSecret as Mock).mockRejectedValue(new Error('network error'));

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('bob.ross@dsit.gov.uk') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to fetch hash key');
  });

  it('WHEN the hash secret is not valid THEN an error is returned', async () => {
    (getSecret as Mock).mockResolvedValue(undefined);

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('bob.ross@dsit.gov.uk') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid hash key');
  });

  it('WHEN no errors occur THEN an hash is returned', async () => {
    (getSecret as Mock).mockResolvedValue('mock_hash_key');

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('bob.ross@dsit.gov.uk') }),
    );
    const response = await lambdaHandler(event, mockContext);
    console.log(response);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response.body).verificationHash).toBeTypeOf('string');
  });
});
