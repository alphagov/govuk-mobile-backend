import { describe, it, expect } from 'vitest';
import { getReasonPhrase } from './status-mappings';

describe('Status Mappings', () => {
  describe('getReasonPhrase', () => {
    it('should return correct reason phrases for 2xx status codes', () => {
      expect(getReasonPhrase(200)).toBe('OK');
      expect(getReasonPhrase(201)).toBe('Created');
      expect(getReasonPhrase(202)).toBe('Accepted');
      expect(getReasonPhrase(204)).toBe('No Content');
    });

    it('should return correct reason phrases for 4xx status codes', () => {
      expect(getReasonPhrase(400)).toBe('Bad Request');
      expect(getReasonPhrase(401)).toBe('Unauthorized');
      expect(getReasonPhrase(403)).toBe('Forbidden');
      expect(getReasonPhrase(404)).toBe('Not Found');
    });

    it('should return correct reason phrases for 5xx status codes', () => {
      expect(getReasonPhrase(500)).toBe('Internal Server Error');
      expect(getReasonPhrase(503)).toBe('Service Unavailable');
    });

    it('should return "Unknown Status" for unmapped status codes', () => {
      expect(getReasonPhrase(999)).toBe('Unknown Status');
      expect(getReasonPhrase(418)).toBe('Unknown Status'); // I'm a teapot
      expect(getReasonPhrase(100)).toBe('Unknown Status');
    });

    it('should handle negative and zero status codes', () => {
      expect(getReasonPhrase(-1)).toBe('Unknown Status');
      expect(getReasonPhrase(0)).toBe('Unknown Status');
    });
  });
});
