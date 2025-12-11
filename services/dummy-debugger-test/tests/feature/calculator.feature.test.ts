import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';

/**
 * BDD-style feature tests for the calculator Lambda function
 * These tests describe the behavior from a user's perspective
 */
describe('Calculator Lambda Feature', () => {
  describe('Feature: Perform arithmetic calculations', () => {
    describe('Scenario: User wants to add two numbers', () => {
      it('Given a request with operation "add", a=15, b=25, When the Lambda processes it, Then it should return result=40', async () => {
        const event: APIGatewayProxyEvent = {
          body: JSON.stringify({ operation: 'add', a: 15, b: 25 }),
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
        };

        const result = await lambdaHandler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toMatchObject({
          operation: 'add',
          a: 15,
          b: 25,
          result: 40,
        });
      });
    });

    describe('Scenario: User wants to subtract two numbers', () => {
      it('Given a request with operation "subtract", a=100, b=30, When the Lambda processes it, Then it should return result=70', async () => {
        const event: APIGatewayProxyEvent = {
          body: JSON.stringify({ operation: 'subtract', a: 100, b: 30 }),
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
        };

        const result = await lambdaHandler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.result).toBe(70);
      });
    });

    describe('Scenario: User attempts invalid operation', () => {
      it('Given a request with an unsupported operation, When the Lambda processes it, Then it should return a 400 error', async () => {
        const event: APIGatewayProxyEvent = {
          body: JSON.stringify({ operation: 'modulus', a: 10, b: 3 }),
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
        };

        const result = await lambdaHandler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toMatch(/Unsupported operation/);
      });
    });

    describe('Scenario: User attempts division by zero', () => {
      it('Given a request with operation "divide" and b=0, When the Lambda processes it, Then it should return a 400 error', async () => {
        const event: APIGatewayProxyEvent = {
          body: JSON.stringify({ operation: 'divide', a: 100, b: 0 }),
          headers: {},
          multiValueHeaders: {},
          httpMethod: 'POST',
          isBase64Encoded: false,
          path: '/',
          pathParameters: null,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          stageVariables: null,
          requestContext: {} as any,
          resource: '',
        };

        const result = await lambdaHandler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Division by zero is not allowed');
      });
    });
  });
});

