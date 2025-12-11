import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';

describe('lambdaHandler', () => {
  describe('Addition operation', () => {
    it('should add two positive numbers correctly', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'add', a: 5, b: 3 }),
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
      expect(body.result).toBe(8);
      expect(body.operation).toBe('add');
    });
  });

  describe('Subtraction operation', () => {
    it('should subtract two numbers correctly', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'subtract', a: 10, b: 4 }),
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
      expect(body.result).toBe(6);
    });
  });

  describe('Multiplication operation', () => {
    it('should multiply two numbers correctly', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'multiply', a: 7, b: 6 }),
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
      expect(body.result).toBe(42);
    });
  });

  describe('Division operation', () => {
    it('should divide two numbers correctly', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'divide', a: 20, b: 4 }),
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
      expect(body.result).toBe(5);
    });

    it('should return error when dividing by zero', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'divide', a: 10, b: 0 }),
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

  describe('Error handling', () => {
    it('should return 400 when required fields are missing', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'add' }),
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
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 for unsupported operation', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ operation: 'power', a: 2, b: 3 }),
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
      expect(body.error).toContain('Unsupported operation');
    });

    it('should handle invalid JSON gracefully', async () => {
      const event: APIGatewayProxyEvent = {
        body: 'invalid json',
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

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });
  });
});

