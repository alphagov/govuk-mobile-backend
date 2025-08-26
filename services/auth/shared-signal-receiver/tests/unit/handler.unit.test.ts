import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandler } from '../../handler';
import { ZodError } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import {
  CognitoError,
  setTokenErrorCodes,
  setTokenErrorDescriptions,
  SignatureVerificationError,
} from '../../errors';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { Dependencies } from '../../app';
import { CredentialChangeEventBuilder, SignalBuilder } from '../helpers/signal';
import { signEventPayload } from '../helpers/sign-jwt';
import { generateKeyPair } from 'jose';
import { DecodedSetContext } from '../../middleware/decode-set';

// Mock the AWS SDK Client
vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  process.env.REGION = 'eu-west-2';
  const actual = await vi.importActual<any>(
    '@aws-sdk/client-cognito-identity-provider',
  );
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn(),
  };
});

const credentialChangeEvent = new CredentialChangeEventBuilder();
const signalBuilder = new SignalBuilder(credentialChangeEvent);

const { publicKey, privateKey } = await generateKeyPair('RS256', {
  extractable: true,
});

const signal = signalBuilder.build();

const mockContext = {
  awsRequestId: 'foobar',
  decodedJwt: {
    ...signal,
    issuer: 'https://identity.example.com',
    audience: 'https://service.example.gov.uk',
    payload: signal,
    alg: 'RS256',
  },
} as DecodedSetContext;

// Create a dummy event
const createEvent = async (overrides?: any): Promise<APIGatewayProxyEvent> =>
  ({
    httpMethod: 'POST',
    body: await signEventPayload({
      ...signal,
      issuer: 'https://identity.example.com',
      audience: 'https://service.example.gov.uk',
      payload: signal,
      alg: 'RS256',
      pk: privateKey,
    }),
    headers: {},
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    path: '/receiver',
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      accountId: '123456789012',
      apiId: '1234',
      httpMethod: 'POST',
      identity: {
        accessKey: '',
        accountId: '',
        apiKey: '',
        apiKeyId: '',
        caller: '',
        clientCert: {
          clientCertPem: '',
          issuerDN: '',
          serialNumber: '',
          subjectDN: '',
          validity: { notAfter: '', notBefore: '' },
        },
        cognitoAuthenticationProvider: '',
        cognitoAuthenticationType: '',
        cognitoIdentityId: '',
        cognitoIdentityPoolId: '',
        principalOrgId: '',
        sourceIp: '127.0.0.1',
        user: '',
        userAgent: '',
        userArn: '',
      },
      path: '/receiver',
      protocol: 'HTTP/1.1',
      requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
      requestTime: '12/Jun/2025:15:00:06 +0000',
      requestTimeEpoch: 1428582896000,
      resourceId: '123456',
      resourcePath: '/receiver',
      stage: 'dev',
    },
    resource: '',
    stageVariables: {},
    ...overrides,
  } as unknown as APIGatewayProxyEvent);

describe('lambdaHandler', () => {
  const mockRequestHandler = vi.fn();

  const getDependencies = (overrides?: any): Dependencies => ({
    getConfig: vi.fn(),
    verifySETJwt: vi.fn().mockResolvedValue({}),
    requestHandler: mockRequestHandler,
    ...overrides,
  });

  const lambdaHandler = createHandler(getDependencies());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a successful response from requestHandler', async () => {
    const mockResponse = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };

    mockRequestHandler.mockResolvedValue(mockResponse);

    const result = await lambdaHandler(await createEvent(), mockContext);

    expect(mockRequestHandler).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it('should return BAD_REQUEST when ZodError is thrown', async () => {
    const zodError = new ZodError([]);
    mockRequestHandler.mockRejectedValue(zodError);

    const result = await lambdaHandler(await createEvent(), mockContext);

    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('should return INTERNAL_SERVER_ERROR when CognitoError is thrown', async () => {
    const cognitoError = new CognitoError('Cognito failed');
    mockRequestHandler.mockRejectedValue(cognitoError);

    const result = await lambdaHandler(await createEvent(), mockContext);

    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body).err).toBe(
      setTokenErrorCodes.INTERNAL_SERVER_ERROR,
    );
  });

  it('should return INTERNAL_SERVER_ERROR for unknown error', async () => {
    const unknownError = new Error('Something went wrong');
    mockRequestHandler.mockRejectedValue(unknownError);

    const result = await lambdaHandler(await createEvent(), mockContext);

    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body).message).toBe(
      ReasonPhrases.INTERNAL_SERVER_ERROR,
    );
  });

  it('should return a bad request if the SET is not signed by the transmitter', async () => {
    const invalidSignatureHandler = createHandler(
      getDependencies({
        verifySETJwt: vi
          .fn()
          .mockRejectedValueOnce(
            new SignatureVerificationError('Invalid token'),
          ),
      }),
    );

    const result = await invalidSignatureHandler(
      await createEvent(),
      mockContext,
    );

    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body)).toEqual({
      err: setTokenErrorCodes.AUTHENTICATION_FAILED,
      description:
        setTokenErrorDescriptions[setTokenErrorCodes.AUTHENTICATION_FAILED],
    });

    expect(mockRequestHandler).not.toHaveBeenCalled();
  });

  it('should return a bad request if the body is missing', async () => {
    const result = await lambdaHandler(
      await createEvent({ body: undefined }),
      mockContext,
    );

    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);

    expect(mockRequestHandler).not.toHaveBeenCalled();
  });

  it('should return a bad request if the body is missing', async () => {
    const result = await lambdaHandler(createEvent({ body: undefined }));

    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);

    expect(mockRequestHandler).not.toHaveBeenCalled();
  });
});
