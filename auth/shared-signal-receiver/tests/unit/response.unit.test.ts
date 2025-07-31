import { describe, it, expect } from 'vitest';
import { generateResponse } from '../../response';

describe('generateResponse', () => {
  it('should return an object conforming to APIGatewayProxyResult shape', () => {
    const response = generateResponse(200, 'OK');

    expect(response).toHaveProperty('statusCode');
    expect(typeof response.statusCode).toBe('number');

    expect(response).toHaveProperty('headers');
    expect(typeof response.headers).toBe('object');

    expect(response).toHaveProperty('body');
    expect(typeof response.body).toBe('string');
  });
});
