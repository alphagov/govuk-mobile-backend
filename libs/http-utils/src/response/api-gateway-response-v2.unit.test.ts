import { describe, it, expect } from 'vitest';
import { generateResponseV2 } from './api-gateway-response-v2';

describe('generateResponseV2', () => {
  it('returns correct response with default headers when headers not provided', () => {
    const result = generateResponseV2({ status: 200, message: 'OK' });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toBe(JSON.stringify({ message: 'OK' }));
    expect(JSON.parse(result.body)).toEqual({ message: 'OK' });
  });

  it('merges provided headers and allows overriding default Content-Type', () => {
    const result = generateResponseV2({
      status: 201,
      message: 'created',
      headers: { 'X-Custom': '123', 'Content-Type': 'text/plain' },
    });

    expect(result.statusCode).toBe(201);
    expect(result.headers).toMatchObject({
      'Content-Type': 'text/plain',
      'X-Custom': '123',
    });
    expect(JSON.parse(result.body)).toEqual({ message: 'created' });
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
