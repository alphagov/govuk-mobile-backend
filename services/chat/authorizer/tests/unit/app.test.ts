import { describe, expect, it, vi } from 'vitest';
import { lambdaHandler } from '../../app';
import { APIGatewayRequestAuthorizerEvent, Context } from 'aws-lambda';

const mockContext = {
  awsRequestId: 'foobar',
} as Context;

vi.mock('../../client/authorizer-client', () => {
  return {
    AuthorizerClient: vi.fn().mockReturnValue({
      authorizerResult: vi.fn().mockResolvedValue({
        policyDocument: {
          Statement: [{ Effect: 'Deny' }],
        },
      }),
    }),
  };
});

const baseEvent = {
  type: 'REQUEST',
  methodArn: 'arn:aws:execute-api:region:account-id:api-id/stage/verb/resource',
  resource: '/test',
  path: '/test',
  httpMethod: 'GET',
  requestContext: {} as any,
  multiValueHeaders: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  pathParameters: null,
  queryStringParameters: null,
};

const generateMockEvent = (
  overrides: Partial<APIGatewayRequestAuthorizerEvent>,
) => {
  return {
    ...baseEvent,
    ...overrides,
  } as APIGatewayRequestAuthorizerEvent;
};

describe('app', () => {
  it('should return a 401 status code when the Authorization header is missing', async () => {
    const event = generateMockEvent({
      headers: {
        Authorization: '',
      },
    });
    const result = await lambdaHandler(event, mockContext);
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  it('should return a 403 status code when the Authorization header is invalid', async () => {
    const event = generateMockEvent({
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    const result = await lambdaHandler(event, mockContext);
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });
});
