import { describe, it, expect } from 'vitest';
import { mergeHeaders, defaultResponseHeaders } from './response-headers';

describe('Response Headers Utils', () => {
  describe('defaultResponseHeaders', () => {
    it('should contain the correct default headers', () => {
      expect(defaultResponseHeaders).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('mergeHeaders', () => {
    it('should return default headers when no custom headers provided', () => {
      const result = mergeHeaders();

      expect(result).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should merge custom headers with defaults', () => {
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        Authorization: 'Bearer token',
      };

      const result = mergeHeaders(customHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
        Authorization: 'Bearer token',
      });
    });

    it('should allow custom headers to override defaults', () => {
      const customHeaders = {
        'Content-Type': 'application/xml',
        'X-Custom-Header': 'custom-value',
      };

      const result = mergeHeaders(customHeaders);

      expect(result).toEqual({
        'Content-Type': 'application/xml',
        'X-Custom-Header': 'custom-value',
      });
    });

    it('should handle empty custom headers object', () => {
      const result = mergeHeaders({});

      expect(result).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });
});
