import { describe, it, expect } from 'vitest';
import { lambdaHandler } from './app';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

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

//mocks
const mockContext = {
  awsRequestId: 'foobar',
} as Context;

describe('GIVEN the Linking Verification Handler is invoked', () => {
  it('WHEN the payload is invalid THEN an error is thrown', async () => {
    const event = getApiGatewayEvent(JSON.stringify({ token: 123 }));
    const response = await lambdaHandler(event, mockContext);
    console.log(response);
    expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(JSON.parse(response.body).message).toBe('Invalid request body');
  });
});
