import { describe, it, expect } from 'vitest';
import { testConfig } from '../common/config';

describe('api gateway', () => {
  it('should return a 401 when no X-Auth token is provided', async () => {
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

  it('should return a 403 when an invalid X-Auth token is provided', async () => {
    const response = await fetch(
      `${testConfig.chatApiGatewayUrl}/conversation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth': 'invalid-token',
        },
      },
    );

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('Message');
    expect(responseBody.Message).toBe(
      'User is not authorized to access this resource with an explicit deny',
    );
  });
});
