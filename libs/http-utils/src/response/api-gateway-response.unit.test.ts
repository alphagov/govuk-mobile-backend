import { describe, it, expect } from 'vitest';
import {
  generateResponse,
  generateErrorResponse,
} from './api-gateway-response';

describe('generateResponse', () => {
  it('returns a JSON response with default headers and provided message/status', () => {
    const result = generateResponse({ status: 200, message: 'ok' });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toBe(JSON.stringify({ message: 'ok' }));
    expect(JSON.parse(result.body)).toEqual({ message: 'ok' });
  });

  it('merges provided headers and allows overriding default Content-Type', () => {
    const result = generateResponse({
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
    const result = generateResponse({
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

describe('generateErrorResponse (SET)', () => {
  it('returns SET error response with err and description fields', () => {
    const error = {
      status: 400,
      errorCode: 'ERR_CODE',
      errorDescription: 'bad request',
    };
    const result = generateErrorResponse(error);

    expect(result.statusCode).toBe(400);
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(result.body)).toEqual({
      err: 'ERR_CODE',
      description: 'bad request',
    });
  });
});
