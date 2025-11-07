import { describe, it, expect } from 'vitest';
import { generateResponseV2 } from './api-gateway-response-v2';

describe('generateResponseV2', () => {
  it('returns correct response with default headers when headers not provided', () => {
    const result = generateResponseV2({ status: 200, message: 'OK' });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toBe(JSON.stringify({ message: 'OK' }));
  });

  it('merges additional headers and allows overriding default Content-Type', () => {
    const result = generateResponseV2({
      status: 201,
      message: 'Created',
      headers: {
        'X-Custom-Header': 'custom',
        'Content-Type': 'application/xml',
      },
    });

    expect(result.statusCode).toBe(201);
    expect(result.headers).toEqual({
      'Content-Type': 'application/xml',
      'X-Custom-Header': 'custom',
    });
    expect(result.body).toBe(JSON.stringify({ message: 'Created' }));
  });

  it('includes additional non-conflicting headers alongside default Content-Type', () => {
    const result = generateResponseV2({
      status: 204,
      message: '',
      headers: { 'Cache-Control': 'no-store' },
    });

    expect(result.statusCode).toBe(204);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    expect(result.body).toBe(JSON.stringify({ message: '' }));
  });
});
