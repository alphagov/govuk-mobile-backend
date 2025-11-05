import { describe, it, expect } from 'vitest';
import { processResponseBody, serializeBody } from './response-body-processor';

describe('Response Body Processor', () => {
  describe('processResponseBody', () => {
    it('should handle string input as message', () => {
      const result = processResponseBody(200, 'Success');
      expect(result).toEqual({ body: { message: 'Success' } });
    });

    it('should prioritize data over other options', () => {
      const result = processResponseBody(200, {
        data: { user: 'john' },
        message: 'ignored',
      });
      expect(result).toEqual({ body: { user: 'john' } });
    });

    it('should use message when provided alone', () => {
      const result = processResponseBody(200, {
        message: 'Success message',
      });
      expect(result).toEqual({ body: { message: 'Success message' } });
    });

    it('should auto-generate error message for 4xx status codes', () => {
      const result = processResponseBody(404, {});
      expect(result).toEqual({ body: { error: 'Not Found' } });
    });

    it('should auto-generate error message for 5xx status codes', () => {
      const result = processResponseBody(500, {});
      expect(result).toEqual({ body: { error: 'Internal Server Error' } });
    });

    it('should auto-generate success message for 2xx status codes', () => {
      const result = processResponseBody(201, {});
      expect(result).toEqual({ body: { message: 'Created' } });
    });

    it('should return error for unknown status codes (4xx+ range)', () => {
      const result = processResponseBody(999, {});
      expect(result).toEqual({ body: { error: 'Unknown Status' } });
    });
    it('should handle 1xx and 3xx status codes', () => {
      const result1xx = processResponseBody(101, {});
      const result3xx = processResponseBody(301, {});

      expect(result1xx).toEqual({ body: {} });
      expect(result3xx).toEqual({ body: {} });
    });
  });

  describe('serializeBody', () => {
    it('should return string as-is', () => {
      const result = serializeBody('already a string');
      expect(result).toBe('already a string');
    });

    it('should stringify objects', () => {
      const result = serializeBody({ message: 'test' });
      expect(result).toBe('{"message":"test"}');
    });

    it('should stringify arrays', () => {
      const result = serializeBody([1, 2, 3]);
      expect(result).toBe('[1,2,3]');
    });

    it('should stringify numbers', () => {
      const result = serializeBody(42);
      expect(result).toBe('42');
    });

    it('should stringify booleans', () => {
      const result = serializeBody(true);
      expect(result).toBe('true');
    });

    it('should handle null by returning empty object string', () => {
      const result = serializeBody(null);
      expect(result).toBe('{}');
    });
    it('should handle undefined by returning empty object', () => {
      const result = serializeBody(undefined);
      expect(result).toBe('{}');
    });

    it('should handle complex nested objects', () => {
      const complex = {
        user: { name: 'John', age: 30 },
        items: [{ id: 1 }, { id: 2 }],
        active: true,
      };
      const result = serializeBody(complex);
      expect(result).toBe(
        '{"user":{"name":"John","age":30},"items":[{"id":1},{"id":2}],"active":true}',
      );
    });
  });
});
