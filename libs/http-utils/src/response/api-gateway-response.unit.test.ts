import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { createResponse } from './api-gateway-response';

describe('API Gateway Response Utils - createResponse', () => {
  describe('ResponseOptions overload', () => {
    it('should create a basic response with default headers', () => {
      const response = createResponse(
        { statusCode: 200 },
        { message: 'Hello World' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello World' }),
      });
    });

    it('should merge custom headers with defaults', () => {
      const response = createResponse(
        {
          statusCode: 201,
          headers: { 'X-Custom': 'value' },
        },
        { data: 'test' },
      );

      expect(response).toEqual({
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
        body: JSON.stringify({ data: 'test' }),
      });
    });

    it('should handle empty body', () => {
      const response = createResponse({ statusCode: 204 });

      expect(response).toEqual({
        statusCode: 204,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    });

    it('should include isBase64Encoded when explicitly set to true', () => {
      const response = createResponse(
        {
          statusCode: 200,
          isBase64Encoded: true,
        },
        { data: 'encoded' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'encoded' }),
        isBase64Encoded: true,
      });
    });

    it('should not include isBase64Encoded when set to false', () => {
      const response = createResponse(
        {
          statusCode: 200,
          isBase64Encoded: false,
        },
        { data: 'test' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
      });
      expect(response.isBase64Encoded).toBeUndefined();
    });

    it('should handle string body directly', () => {
      const response = createResponse(
        { statusCode: 200 },
        'plain text response',
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: 'plain text response',
      });
    });

    it('should handle null body', () => {
      const response = createResponse({ statusCode: 200 }, null);

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    });

    it('should handle undefined body', () => {
      const response = createResponse({ statusCode: 200 }, undefined);

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    });
  });

  describe('JsonResponseOptions overload', () => {
    it('should create a JSON response with provided options', () => {
      const response = createResponse(
        { statusCode: 200 },
        { message: 'success' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'success' }),
      });
    });

    it('should create a JSON response with custom status and body', () => {
      const response = createResponse({ statusCode: 201 }, { created: true });

      expect(response).toEqual({
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created: true }),
      });
    });

    it('should allow additional headers', () => {
      const response = createResponse(
        {
          statusCode: 200,
          headers: { 'X-API-Version': '1.0' },
        },
        { data: 'test' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '1.0',
        },
        body: JSON.stringify({ data: 'test' }),
      });
    });

    it('should override Content-Type when specified', () => {
      const response = createResponse(
        {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
        },
        'plain text',
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'plain text',
      });
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: {
          id: 123,
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          version: '1.0',
        },
      };

      const response = createResponse({ statusCode: 200 }, complexObject);

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexObject),
      });
    });
  });

  describe('Automatic body processing overload', () => {
    it('should create a response with string message', () => {
      const response = createResponse(200, 'Success');

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    it('should use data when provided', () => {
      const response = createResponse(200, {
        data: { items: [1, 2, 3] },
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [1, 2, 3] }),
      });
    });

    it('should auto-generate success message for 2xx status codes', () => {
      const response = createResponse(StatusCodes.OK);

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'OK' }),
      });
    });

    it('should auto-generate error message for 4xx status codes', () => {
      const response = createResponse(StatusCodes.BAD_REQUEST);

      expect(response).toEqual({
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request' }),
      });
    });

    it('should auto-generate error message for 5xx status codes', () => {
      const response = createResponse(StatusCodes.INTERNAL_SERVER_ERROR);

      expect(response).toEqual({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    it('should handle unknown status codes by generating error message', () => {
      const response = createResponse(999);

      expect(response).toEqual({
        statusCode: 999,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unknown Status' }),
      });
    });

    it('should include additional headers', () => {
      const customHeaders = { 'X-Custom-Header': 'custom-value' };
      const response = createResponse(200, 'Success', customHeaders);

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    it('should handle empty bodyConfig object', () => {
      const response = createResponse(201, {});

      expect(response).toEqual({
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Created' }),
      });
    });

    it('should prioritize data over automatic message generation', () => {
      const response = createResponse(200, {
        data: { custom: 'content' },
        message: 'This should be ignored',
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom: 'content' }),
      });
    });

    it('should handle multiple custom headers', () => {
      const customHeaders = {
        'X-Custom-Header': 'value1',
        'X-Another-Header': 'value2',
        'Cache-Control': 'no-cache',
      };
      const response = createResponse(200, 'Success', customHeaders);

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'value1',
          'X-Another-Header': 'value2',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ message: 'Success' }),
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle 0 status code', () => {
      const response = createResponse(0, 'Test');

      expect(response).toEqual({
        statusCode: 0,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' }),
      });
    });

    it('should handle negative status code', () => {
      const response = createResponse(-1, 'Test');

      expect(response).toEqual({
        statusCode: -1,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' }),
      });
    });

    it('should handle very large status code', () => {
      const response = createResponse(9999, 'Test');

      expect(response).toEqual({
        statusCode: 9999,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' }),
      });
    });

    it('should handle circular reference in body (should throw)', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      expect(() => {
        createResponse({ statusCode: 200 }, circularObject);
      }).toThrow();
    });

    it('should handle array data in automatic processing', () => {
      const response = createResponse(200, {
        data: { items: [1, 2, 3, 4, 5] },
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [1, 2, 3, 4, 5] }),
      });
    });

    it('should handle boolean data in automatic processing', () => {
      const response = createResponse(200, {
        data: { success: true, enabled: false },
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, enabled: false }),
      });
    });

    it('should handle number data in automatic processing', () => {
      const response = createResponse(200, {
        data: { count: 42, total: 100 },
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 42, total: 100 }),
      });
    });
  });

  describe('Common HTTP status codes', () => {
    const testCases = [
      { code: 200, expected: 'OK' },
      { code: 201, expected: 'Created' },
      { code: 202, expected: 'Accepted' },
      { code: 204, expected: 'No Content' },
      { code: 400, expected: 'Bad Request' },
      { code: 401, expected: 'Unauthorized' },
      { code: 403, expected: 'Forbidden' },
      { code: 404, expected: 'Not Found' },
      { code: 409, expected: 'Unknown Status' }, // Not in the mapping
      { code: 422, expected: 'Unknown Status' }, // Not in the mapping
      { code: 500, expected: 'Internal Server Error' },
      { code: 502, expected: 'Unknown Status' }, // Not in the mapping
      { code: 503, expected: 'Service Unavailable' },
    ];

    testCases.forEach(({ code, expected }) => {
      it(`should auto-generate correct message for ${code} ${expected}`, () => {
        const response = createResponse(code);
        const isSuccessCode = code >= 200 && code < 300;
        const expectedBody = isSuccessCode
          ? { message: expected }
          : { error: expected };

        expect(response).toEqual({
          statusCode: code,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expectedBody),
        });
      });
    });
  });
});
