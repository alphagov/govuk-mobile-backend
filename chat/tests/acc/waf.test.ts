import { describe, beforeAll, expect, it } from 'vitest';
import { testConfig } from '../common/config';
import axios from 'axios';
import { repeatedlyRequestEndpoint } from '../driver/waf.driver';

describe('waf', () => {
  const numRequests = 100000;
  const responseCodes = [];
  const requestFn = async () => {
    const response = await axios.post(
      `${testConfig.chatApiGatewayUrl}/${testConfig.environment}/conversation`,
    );
    return response;
  };

  beforeAll(async () => {
    await repeatedlyRequestEndpoint(numRequests, requestFn, responseCodes, 1);
  }, 300000);

  it('should respond with 429 error code when the rate limit is exceeded', async () => {
    expect(responseCodes).toContain(429);
  });
});
