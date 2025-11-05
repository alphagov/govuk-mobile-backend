import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { createResponseV2 } from './api-gateway-response-v2';

describe('API Gateway Response V2 Utils', () => {
  describe('createResponseV2 with options overload', () => {
    it('should create a basic V2 response with default headers', () => {
      const response = createResponseV2(
        { statusCode: 200 },
        { message: 'Hello World' },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello World' }),
      });
    });

    it('should include cookies when provided', () => {
      const response = createResponseV2(
        {
          statusCode: 200,
          cookies: ['session=abc123', 'preferences=theme%3Dark'],
        },
        { success: true },
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
        cookies: ['session=abc123', 'preferences=theme%3Dark'],
      });
    });

    it('should merge custom headers with defaults', () => {
      const response = createResponseV2(
        {
          statusCode: 201,
          headers: {
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/vnd.api+json',
          },
        },
        { created: true },
      );

      expect(response).toEqual({
        statusCode: 201,
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'X-Custom-Header': 'custom-value',
        },
        body: JSON.stringify({ created: true }),
      });
    });

    it('should override default Content-Type header', () => {
      const response = createResponseV2(
        {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
        },
        'Plain text response',
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Plain text response',
      });
    });

    it('should handle empty body with raw serialization', () => {
      const response = createResponseV2({ statusCode: 204 });

      expect(response).toEqual({
        statusCode: 204,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    });

    it('should handle string body', () => {
      const response = createResponseV2(
        { statusCode: 200 },
        'Raw string response',
      );

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: 'Raw string response',
      });
    });
  });

  describe('createResponseV2 with automatic body processing', () => {
    it('should create a response with string message', () => {
      const response = createResponseV2(200, 'Success');

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    it('should use data when provided', () => {
      const response = createResponseV2(200, {
        data: { user: 'john', id: 123 },
        message: 'ignored',
      });

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'john', id: 123 }),
      });
    });

    it('should auto-generate success message for 2xx status codes', () => {
      const response = createResponseV2(StatusCodes.OK);

      expect(response).toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'OK' }),
      });
    });

    it('should auto-generate error message for 4xx status codes', () => {
      const response = createResponseV2(StatusCodes.BAD_REQUEST);

      expect(response).toEqual({
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request' }),
      });
    });

    it('should handle unknown status codes by generating error message', () => {
      const response = createResponseV2(999);

      expect(response).toEqual({
        statusCode: 999,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unknown Status' }),
      });
    });

    it('should include additional headers', () => {
      const customHeaders = {
        'X-Request-ID': '12345',
        'Content-Type': 'application/x-amz-json-1.1',
      };
      const response = createResponseV2(200, 'Success', customHeaders);

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Request-ID': '12345',
        },
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    it('should use explicit message field with custom headers', () => {
      const awsHeaders = { 'Content-Type': 'application/x-amz-json-1.1' };
      const response = createResponseV2(
        StatusCodes.BAD_REQUEST,
        {
          message: 'Bad Request',
        },
        awsHeaders,
      );

      expect(response).toEqual({
        statusCode: 400,
        headers: { 'Content-Type': 'application/x-amz-json-1.1' },
        body: JSON.stringify({ message: 'Bad Request' }),
      });
    });
  });
});
