import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterAll,
  beforeAll,
} from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { proxy, ProxyInput } from '../../proxy';
import { sendHttpRequest } from '@libs/http-utils';
import type { AppConfig } from '../../config';

vi.mock('@libs/http-utils', async () => {
  const actual = await vi.importActual('@libs/http-utils');
  return {
    ...actual,
    sendHttpRequest: vi.fn(),
  };
});

const mockAppConfig = {
  timeoutMs: 3000,
} as AppConfig;

const createMockInput = (overrides: Partial<ProxyInput> = {}): ProxyInput => ({
  method: 'POST',
  body: {
    grant_type: 'authorization_code',
    client_id: 'mock-client-id',
    redirect_uri: 'mock-redirect-uri',
    code: 'mock-code',
    code_verifier: 'mock-code-verifier',
    scope: 'mock-scope',
  },
  parsedUrl: new URL('https://app-dev.auth.eu-west-2.amazoncognito.com/token'),
  path: '/token',
  sanitizedHeaders: {
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': 'mock-user-agent',
    connection: 'keep-alive',
    'x-attestation-token': 'test-token',
  },
  clientSecret: 'mock-client-secret', // pragma: allowlist secret
  config: mockAppConfig,
  ...overrides,
});

describe('proxy', () => {
  beforeAll(() => {
    vi.stubEnv('COGNITO_URL', 'https://mock.auth.region.amazoncognito.com');
    vi.mocked(sendHttpRequest).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('mock response'),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('proxies a valid GET /authorize request', async () => {
    const response = await proxy(
      createMockInput({
        path: '/authorize',
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('mock response');
  });

  it('proxies a valid POST /token request', async () => {
    const response = await proxy(createMockInput());

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('mock response');
  });

  it('throws an exception if an error event is triggered', async () => {
    // Replace the implementation temporarily
    vi.mocked(sendHttpRequest).mockImplementationOnce(() => {
      throw new Error('Mocked failure');
    });

    const brokenEvent = createMockInput({ path: '' });
    await expect(proxy(brokenEvent)).rejects.toThrow(Error('Mocked failure'));
  });

  it('should handle missing headers', async () => {
    vi.mocked(sendHttpRequest).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('mock response'),
      headers: new Headers(),
    });
    const response = await proxy(createMockInput());
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('mock response');
  });
});
