import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import { SharedSignalsHealthCheckService } from '../../../service/health-check-service';
import { SecretsService } from '../../../service/secrets-service';
import { AuthError, VerifyError } from '../../../errors';

vi.mock('axios');
vi.mock('../../../service/secrets-service');

const region = 'eu-west-2';
const healthCheckTokenUrl = 'https://token-url.example.com';
const healthCheckVerifyUrl = 'https://verify-url.example.com';
const healthCheckSecretName = 'my-secret-name';

const secretsConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('SharedSignalsHealthCheckService', () => {
  let service: SharedSignalsHealthCheckService;
  let secretsServiceMock: SecretsService;

  beforeEach(() => {
    secretsServiceMock = new SecretsService(region) as any;
    (SecretsService as any).mockClear();
    (secretsServiceMock.getSecret as any) = vi.fn();
    service = new SharedSignalsHealthCheckService(
      region,
      healthCheckTokenUrl,
      healthCheckVerifyUrl,
      healthCheckSecretName,
    );
    // Inject mock secretsService
    (service as any).secretsService = secretsServiceMock;
  });

  describe('authorise', () => {
    it('should return access token on success', async () => {
      (secretsServiceMock.getSecret as any).mockResolvedValue(secretsConfig);
      (axios as any).mockResolvedValue({
        status: StatusCodes.OK,
        data: { access_token: 'test-access-token' },
      });

      const token = await service.authorise();
      expect(token).toBe('test-access-token');
    });

    it('should throw AuthError if response status is not OK', async () => {
      (secretsServiceMock.getSecret as any).mockResolvedValue(secretsConfig);
      (axios as any).mockResolvedValue({
        status: StatusCodes.BAD_REQUEST,
        statusText: 'Bad Request',
        data: {},
      });

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if access_token is missing', async () => {
      (secretsServiceMock.getSecret as any).mockResolvedValue(secretsConfig);
      (axios as any).mockResolvedValue({
        status: StatusCodes.OK,
        data: {},
      });

      await expect(service.authorise()).rejects.toThrow('No access token found in the response');
    });

    it('should throw AuthError on exception', async () => {
      (secretsServiceMock.getSecret as any).mockRejectedValue(new Error('Secret error'));

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });
  });

  describe('verify', () => {
    it('should return true if status is NO_CONTENT', async () => {
      (axios as any).mockResolvedValue({
        status: StatusCodes.NO_CONTENT,
        statusText: 'No Content',
      });

      const result = await service.verify('test-token');
      expect(result).toBe(true);
    });

    it('should throw VerifyError if status is not NO_CONTENT', async () => {
      (axios as any).mockResolvedValue({
        status: StatusCodes.UNAUTHORIZED,
        statusText: 'Unauthorized',
      });

      await expect(service.verify('test-token')).rejects.toThrow(VerifyError);
    });

    it('should throw VerifyError on exception', async () => {
      (axios as any).mockRejectedValue(new Error('Axios error'));

      await expect(service.verify('test-token')).rejects.toThrow(VerifyError);
    });
  });

  describe('constructAuthoriseAxiosRequestConfig', () => {
    it('should construct correct axios config', () => {
      const config = (service as any).constructAuthoriseAxiosRequestConfig(secretsConfig);
      expect(config.method).toBe('POST');
      expect(config.url).toBe(healthCheckTokenUrl);
      expect(config.headers.Authorization).toMatch(/^Basic /);
      expect(config.data).toEqual({ grant_type: 'client_credentials' });
    });
  });

  describe('constructVerifyAxiosRequestConfig', () => {
    it('should construct correct axios config', () => {
      const config = (service as any).constructVerifyAxiosRequestConfig('bearer-token');
      expect(config.method).toBe('POST');
      expect(config.url).toBe(healthCheckVerifyUrl);
      expect(config.headers.Authorization).toBe('Bearer bearer-token');
      expect(config.data).toEqual({ state: 'govuk-app-health-check' });
    });
  });
});