import { extractCSRFTokenHelper } from './csrf';
import { describe, it, expect } from 'vitest';

const mockHTML = `<form><input type="hidden" name="_csrf" value="abc123def456" /></form>`; //pragma: allowlist secret

const mockMissHTML = `<form><input type="hidden" name="not_a_csrf" value="abc123def456" /></form>`; // pragma: allowlist secret

const mockOtherNameHTML = `<form><input type="hidden" name="csrfmiddlewaretoken" value="abc123def456" /></form>`; // pragma: allowlist secret

describe('CSRF helper tests', () => {
  it('should retrieve a CSRF', () => {
    const csrf = extractCSRFTokenHelper(mockHTML);
    expect(csrf).toEqual('abc123def456'); // pragma: allowlist secret
  });
  it('should return nothing in the event of no csrf token found', () => {
    const miss = extractCSRFTokenHelper(mockMissHTML);
    expect(miss).toBeFalsy();
  });
  it('should suggest other CSRF names if they are found after a miss', () => {
    const originalConsoleError = console.error;
    const errorMessages = [];

    // Mock console.error to capture messages
    console.error = (...args) => {
      errorMessages.push(args.join(' '));
    };

    const miss = extractCSRFTokenHelper(mockOtherNameHTML);
    expect(miss).toBeFalsy();
    expect(errorMessages.length).toBeGreaterThan(0);
    console.error = originalConsoleError;
    console.error(errorMessages.join(''));
  });
});
