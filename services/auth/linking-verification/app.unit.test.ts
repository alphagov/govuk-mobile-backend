import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { lambdaHandler } from './app';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { clearCaches } from '@aws-lambda-powertools/parameters';
import { exportSPKI, generateKeyPair, generateSecret, SignJWT } from 'jose';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { SignCommand, KMSClient } from '@aws-sdk/client-kms';

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

const generateJwt = async (sub: string, username?: string) => {
  const secretKey = await generateSecret('HS256');
  const payload = {
    ...(sub ? { sub: sub } : {}),
    ...(username ? { username: username } : {}),
  };
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setSubject(sub)
    .sign(secretKey);
};

const generateTestingKeyPair = async () => {
  return generateKeyPair('RS256');
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
const kmsMock = mockClient(KMSClient);

describe('GIVEN the Linking Verification Handler is invoked', () => {
  beforeEach(() => {
    vi.stubEnv('VERIFICATION_HASH_KEY_SECRET_NAME', testParamName);
    vi.stubEnv('SESSION_HASH_KEY_SECRET_NAME', testParamName);
    vi.stubEnv('DVLA_JWE_PUB_KEY_PARAM_NAME', testParamName);
    vi.stubEnv('DVLA_JWS_SIGNING_KEY_ID', testParamName);
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

  it.each([
    { env: 'VERIFICATION_HASH_KEY_SECRET_NAME' },
    { env: 'SESSION_HASH_KEY_SECRET_NAME' },
    { env: 'DVLA_JWE_PUB_KEY_PARAM_NAME' },
    { env: 'DVLA_JWS_SIGNING_KEY_ID' },
    { env: 'USER_POOL_ID' },
  ])(
    'WHEN the $env is not valid THEN an error is returned',
    async ({ env }) => {
      vi.stubEnv(env, undefined);
      const event = getApiGatewayEvent(JSON.stringify({ token: 'abc' }));
      const response = await lambdaHandler(event, mockContext);
      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(JSON.parse(response.body).message).toBe(
        'Invalid environment variables',
      );
    },
  );

  it('WHEN the jwt lacks a username THEN an error is returned', async () => {
    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub) }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid claims in token');
  });

  it('WHEN the jwt lacks a sub THEN an error is returned', async () => {
    const sub = '';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid claims in token');
  });

  it('WHEN cognito throws an error THEN an error is returned', async () => {
    cognitoMock
      .on(AdminGetUserCommand)
      .rejects(new Error('Failed to get user'));
    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Cognito Failure');
  });

  it('WHEN cognito returns no email attribute THEN an error is returned', async () => {
    cognitoMock
      .on(AdminGetUserCommand)
      .resolves({ UserAttributes: [{ Name: 'abc', Value: '123' }] });
    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('No valid cognito email');
  });

  it('WHEN the verification hash secret fails to fetch THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock).mockRejectedValue(new Error('network error'));

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to fetch key(s)');
  });

  it('WHEN the verification hash secret is not valid THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock).mockResolvedValue(undefined);

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid key(s)');
  });

  it('WHEN the session hash secret fails to fetch THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetched first secret')
      .mockRejectedValue(new Error('network error'));

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to fetch key(s)');
  });

  it('WHEN the session hash secret is not valid THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetchedFirstValid')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce('fetchedThirdValid');

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid key(s)');
  });

  it('WHEN the dvla JWE Pub Key param fails to fetch THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetched first secret')
      .mockResolvedValueOnce('fetched second secret')
      .mockRejectedValue(new Error('network error'));

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to fetch key(s)');
  });

  it('WHEN the dvla JWE Pub Key is not valid THEN an error is returned', async () => {
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetchedFirstValid')
      .mockResolvedValueOnce('fetchedSecondValid')
      .mockResolvedValue(undefined);

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Invalid key(s)');
  });

  it('WHEN kms throws an error THEN an error is returned', async () => {
    const keys = await generateTestingKeyPair();
    const pubKeyPem = exportSPKI(keys.publicKey);
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetchedFirstValid')
      .mockResolvedValueOnce('fetchedSecondValid')
      .mockResolvedValue(pubKeyPem);
    kmsMock.on(SignCommand).rejects(new Error('Network Error'));

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('Failed to sign token');
  });

  it('WHEN kms does not return a signature THEN an error is returned', async () => {
    const keys = await generateTestingKeyPair();
    const pubKeyPem = exportSPKI(keys.publicKey);
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('fetchedFirstValid')
      .mockResolvedValueOnce('fetchedSecondValid')
      .mockResolvedValue(pubKeyPem);
    kmsMock.on(SignCommand).resolves({});

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toBe('No signature returned');
  });

  it('WHEN no errors occur THEN a JWE is returned', async () => {
    const keys = await generateTestingKeyPair();
    const pubKeyPem = exportSPKI(keys.publicKey);
    cognitoMock.on(AdminGetUserCommand).resolves({
      UserAttributes: [{ Name: 'email', Value: 'bob.ross123@dsit.gov.uk' }],
    });
    (getSecret as Mock)
      .mockResolvedValueOnce('mock_hash_key')
      .mockResolvedValueOnce('mock_hash_key')
      .mockResolvedValue(pubKeyPem);
    kmsMock.on(SignCommand).resolves({ Signature: Uint8Array.from('abc123') });

    const sub = 'test123';
    const event = getApiGatewayEvent(
      JSON.stringify({ token: await generateJwt(sub, 'username-123') }),
    );
    const response = await lambdaHandler(event, mockContext);
    const responseBody = JSON.parse(response.body);

    // const decryptedToken = compactDecrypt(responseBody.token, keys.privateKey);
    //TODO: Ensure the token is decryptable with test key pair, but need to wait for
    // correct key algs, encs from DVLA, this may all change

    expect(response.statusCode).toBe(StatusCodes.OK);
    expect(responseBody.token).toBeTypeOf('string');
  });
});
