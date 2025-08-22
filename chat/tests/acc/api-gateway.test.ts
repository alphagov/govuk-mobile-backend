import { describe, it, expect } from 'vitest';
import { testConfig } from '../common/config';

describe('api gateway', () => {
  it('should return a 401 when no Authorization token is provided', async () => {
    const response = await fetch(
      `${testConfig.chatApiGatewayUrl}/conversation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Unauthorized');
  });

  it('should return a 403 when an invalid Authorization token is provided', async () => {
    const response = await fetch(
      `${testConfig.chatApiGatewayUrl}/conversation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'invalid-token',
        },
      },
    );

    expect(response.status).toBe(403);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe('Unauthorized');
  });
});
