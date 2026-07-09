import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { lambdaHandler } from './app';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { clearCaches } from '@aws-lambda-powertools/parameters';
import { generateSecret, SignJWT } from 'jose';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Validation
 * Env Vars missing
 * No Sub in JWT
 * Cognito Email fetch error
 * Cognito no Email
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

const generateJwt = async (sub?: string) => {
  const secretKey = await generateSecret('HS256');
  const payload = {
    ...(sub ? { sub: sub } : {}),
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
const testPoolId = 'TEST_USER_POOL_123';

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

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('GIVEN the Linking Verification Handler is invoked', () => {
  beforeEach(() => {
    vi.stubEnv('HASH_KEY_SECRET_NAME', testParamName);
    vi.stubEnv('USER_POOL_ID', testPoolId);
    vi.clearAllMocks();
    cognitoMock.reset();
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

  it('WHEN the hash key variable is not valid THEN an error is returned', async () => {
    vi.stubEnv('HASH_KEY_SECRET_NAME', undefined);
    const event = getApiGatewayEvent(JSON.stringify({ token: 'abc' }));
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe(
      'Invalid environment variables',
    );
  });

  it('WHEN the user pool id is not valid THEN an error is returned', async () => {
    vi.stubEnv('USER_POOL_ID', undefined);
    const event = getApiGatewayEvent(JSON.stringify({ token: 'abc' }));
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe(
      'Invalid environment variables',
    );
  });

  it('WHEN the jwt lacks a sub THEN an error is returned', async () => {
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt() }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('No valid sub in token');
  });

  it('WHEN cognito throws an error THEN an error is returned', async () => {
    cognitoMock
      .on(AdminGetUserCommand)
      .rejects(new Error('Failed to get user'));
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('user-sub-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Cognito Failure');
  });

  it('WHEN cognito returns no email attribute THEN an error is returned', async () => {
    cognitoMock
      .on(AdminGetUserCommand)
      .resolves({ UserAttributes: [{ Name: 'abc', Value: '123' }] });
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('user-sub-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('No valid cognito email');
  });

  it('WHEN the hash secret fails to fetch THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock).mockRejectedValue(new Error('network error'));

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('user-sub-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to fetch hash key');
  });

  it('WHEN the hash secret is not valid THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock).mockResolvedValue(undefined);

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('user-sub-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid hash key');
  });

  it('WHEN no errors occur THEN an hash is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock).mockResolvedValue('mock_hash_key');

    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt('user-sub-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    console.log(response);
    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response.body).verificationHash).toBeTypeOf('string');
  });
});
