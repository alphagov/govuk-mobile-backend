import { lambdaHandler } from '../../app';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import * as cognitoModule from '../../../revoke-token/cognito';
import * as revokeModule from '../../../revoke-token/revoke-refresh-token';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { InvalidParameterError } from '../../errors';

vi.mock('@aws-sdk/client-cognito-identity-provider');
vi.mock('../../../revoke-token/cognito');
vi.mock('../../../revoke-token/revoke-refresh-token');

describe('lambdaHandler - revoke-token', () => {
  const mockRetrieveCognitoCredentials =
    cognitoModule.retrieveCognitoCredentials as unknown as vi.Mock;
  const mockRevokeRefreshToken =
    revokeModule.revokeRefreshToken as unknown as vi.Mock;

  const mockContext = {
    awsRequestId: 'foobar',
  } as Context;

  const createMockEvent = (overrides?: any): APIGatewayProxyEvent => ({
    body: 'refresh_token=testRefreshToken&client_id=testClientId',
    routeKey: '$default',
    rawPath: '/my/path',
    headers: {
      header1: 'value1',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, application/x-www-form-urlencoded',
    },
    requestContext: {
      requestId: 'id',
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if body is missing', async () => {
    const event = createMockEvent({ body: null });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('returns 400 if body is empty string', async () => {
    const event = createMockEvent({ body: '' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('returns 400 if refresh_token is missing', async () => {
    const event = createMockEvent({ body: 'client_id=testClientId' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('returns 400 if client_id is missing', async () => {
    const event = createMockEvent({ body: 'refresh_token=testRefreshToken' });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('returns 400 if parameters are invalid', async () => {
    const event = createMockEvent({
      body: 'client_id=testClientId&refresh_token=refresh_token',
    });

    mockRetrieveCognitoCredentials.mockResolvedValue({
      clientId: 'resolvedClientId',
      clientSecret: 'resolvedClientSecret', // pragma: allowlist secret
    });
    mockRevokeRefreshToken.mockRejectedValueOnce(
      new InvalidParameterError(
        ReasonPhrases.BAD_REQUEST,
        'Invalid parameters provided to Cognito (e.g., token format or client ID).',
      ),
    );

    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('returns 400 if content-type is not application/x-www-form-urlencoded', async () => {
    const event = createMockEvent({
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await lambdaHandler(event, mockContext);
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.BAD_REQUEST);
  });

  it('handles array values for refresh_token and client_id', async () => {
    mockRetrieveCognitoCredentials.mockResolvedValue({
      clientId: 'resolvedClientId',
      clientSecret: 'resolvedClientSecret', // pragma: allowlist secret
    });
    mockRevokeRefreshToken.mockResolvedValue({
      statusCode: StatusCodes.OK,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Success' }),
    });

    const event = createMockEvent();

    const result = await lambdaHandler(event, mockContext);

    expect(mockRetrieveCognitoCredentials).toHaveBeenCalledWith(
      { clientId: 'testClientId' },
      expect.any(CognitoIdentityProviderClient),
    );
    expect(mockRevokeRefreshToken).toHaveBeenCalledWith(
      {
        Token: 'testRefreshToken',
        ClientId: 'resolvedClientId',
        ClientSecret: 'resolvedClientSecret', // pragma: allowlist secret
      },
      expect.any(CognitoIdentityProviderClient),
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Success');
  });

  it('returns result from revokeRefreshToken', async () => {
    mockRetrieveCognitoCredentials.mockResolvedValue({
      clientId: 'resolvedClientId',
      clientSecret: 'resolvedClientSecret', // pragma: allowlist secret
    });
    mockRevokeRefreshToken.mockResolvedValue({
      statusCode: StatusCodes.OK,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: ReasonPhrases.OK }),
    });

    const event = createMockEvent({
      body: 'refresh_token=validRefreshToken&client_id=validClientId',
    });

    const result = await lambdaHandler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe(ReasonPhrases.OK);
  });
});
