import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest';
import axios from 'axios';
import { AuthError, VerifyError } from '../../../errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { SharedSignalHealthCheckService } from '../../../service/health-check-service';

vi.mock('axios');
vi.mock('@aws-lambda-powertools/parameters/secrets');

const healthCheckTokenUrl = 'https://token-url';
const healthCheckVerifyUrl = 'https://verify-url';
const healthCheckSecretName = 'secret-name'; // pragma: allowlist secret

const secretsConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret', // pragma: allowlist secret
};

const accessToken = 'access-token';

describe('SharedSignalHealthCheckService', () => {
  let service: SharedSignalHealthCheckService;

  beforeEach(() => {
    service = new SharedSignalHealthCheckService(
      healthCheckTokenUrl,
      healthCheckVerifyUrl,
      healthCheckSecretName,
    );
    vi.clearAllMocks();
  });

  describe('authorise', () => {
    it('should throw AuthError if secret is undefined', async () => {
      (getSecret as any).mockResolvedValue(undefined);
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if secret is not a string', async () => {
      (getSecret as any).mockResolvedValue({ not: 'a string' });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if axios response status is not OK', async () => {
      (getSecret as any).mockResolvedValue(JSON.stringify(secretsConfig));
      (axios as any).mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        data: {},
      });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if access_token is missing', async () => {
      (getSecret as any).mockResolvedValue(JSON.stringify(secretsConfig));
      (axios as any).mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: {},
      });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should return access_token on success', async () => {
      (getSecret as any).mockResolvedValue(JSON.stringify(secretsConfig));
      (axios as any).mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: { access_token: accessToken },
      });
      const token = await service.authorise();
      expect(token).toBe(accessToken);
    });
  });

  describe('verify', () => {
    it('should throw VerifyError if response status is not NO_CONTENT', async () => {
      (axios as any).mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
      });
      await expect(service.verify('token')).rejects.toThrow(VerifyError);
    });

    it('should return true if response status is NO_CONTENT', async () => {
      (axios as any).mockResolvedValue({
        status: 204,
        statusText: 'No Content',
      });
      const result = await service.verify('token');
      expect(result).toBe(true);
    });
  });

  describe('constructAuthoriseAxiosRequestConfig', () => {
    beforeAll(() => {
      vi.clearAllMocks();
      vi.stubEnv('HEALTH_CHECK_TIMEOUT_MS', '1000');
    });
    afterAll(() => {
      vi.unstubAllEnvs();
    });
    it('should construct correct AxiosRequestConfig', () => {
      const config = (service as any).constructAuthoriseAxiosRequestConfig(
        secretsConfig,
      );
      expect(config.method).toBe('POST');
      expect(config.url).toBe(healthCheckTokenUrl);
      expect(config.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      );
      expect(config.headers.Authorization).toMatch(/^Basic /);
      expect(config.data).toEqual({ grant_type: 'client_credentials' });
      expect(config.timeout).toBe(1000);
    });
  });

  describe('constructVerifyAxiosRequestConfig', () => {
    beforeAll(() => {
      vi.clearAllMocks();
      vi.stubEnv('HEALTH_CHECK_TIMEOUT_MS', '1000');
    });
    afterAll(() => {
      vi.unstubAllEnvs();
    });
    it('should construct correct AxiosRequestConfig', () => {
      const token = 'bearer-token';
      const config = (service as any).constructVerifyAxiosRequestConfig(token);
      expect(config.method).toBe('POST');
      expect(config.url).toBe(healthCheckVerifyUrl);
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers.Authorization).toBe(`Bearer ${token}`);
      expect(config.data).toEqual({ state: 'govuk-app-health-check' });
      expect(config.timeout).toBe(1000);
    });
  });
});
