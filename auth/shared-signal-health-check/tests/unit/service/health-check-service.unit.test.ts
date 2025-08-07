import { describe, it, beforeEach, vi, expect } from 'vitest';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import { SharedSignalHealthCheckService } from '../../../service/health-check-service';
import { AuthError, VerifyError } from '../../../errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

vi.mock('axios');
vi.mock('@aws-lambda-powertools/parameters/secrets');

const TOKEN_URL = 'https://token.url';
const VERIFY_URL = 'https://verify.url';
const SECRET_NAME = 'secret-name'; //pragma: allowlist secret

const secretsConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret', //pragma: allowlist secret
};

const secretString = JSON.stringify(secretsConfig);

const service = new SharedSignalHealthCheckService(
  TOKEN_URL,
  VERIFY_URL,
  SECRET_NAME,
);

describe('SharedSignalHealthCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorise', () => {
    it('should return access token on success', async () => {
      (getSecret as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        secretString,
      );
      (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: StatusCodes.OK,
        statusText: 'OK',
        data: { access_token: 'token123' },
      });

      const token = await service.authorise();
      expect(token).toBe('token123');
      expect(getSecret).toHaveBeenCalledWith(SECRET_NAME);
      expect(axios).toHaveBeenCalled();
    });

    it('should throw AuthError if secret is undefined', async () => {
      (getSecret as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if response status is not OK', async () => {
      (getSecret as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        secretString,
      );
      (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: StatusCodes.BAD_REQUEST,
        statusText: 'Bad Request',
        data: {},
      });

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if access_token is missing', async () => {
      (getSecret as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        secretString,
      );
      (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: StatusCodes.OK,
        statusText: 'OK',
        data: {},
      });

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError on axios error', async () => {
      (getSecret as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        secretString,
      );
      (axios as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.authorise()).rejects.toThrow(AuthError);
    });
  });

  describe('verify', () => {
    it('should return true if status is NO_CONTENT', async () => {
      (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: StatusCodes.NO_CONTENT,
        statusText: 'No Content',
      });

      const result = await service.verify('token123');
      expect(result).toBe(true);
      expect(axios).toHaveBeenCalled();
    });

    it('should throw VerifyError if status is not NO_CONTENT', async () => {
      (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: StatusCodes.UNAUTHORIZED,
        statusText: 'Unauthorized',
      });

      await expect(service.verify('token123')).rejects.toThrow(VerifyError);
    });

    it('should throw VerifyError on axios error', async () => {
      (axios as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.verify('token123')).rejects.toThrow(VerifyError);
    });
  });

  describe('constructAuthoriseAxiosRequestConfig', () => {
    it('should construct correct axios config', () => {
      // @ts-expect-error: testing private method
      const config =
        service.constructAuthoriseAxiosRequestConfig(secretsConfig);
      expect(config.method).toBe('POST');
      expect(config.url).toBe(TOKEN_URL);
      expect(config.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      );
      expect(config.headers.Authorization).toMatch(/^Basic /);
      expect(config.data.grant_type).toBe('client_credentials');
    });
  });

  describe('constructVerifyAxiosRequestConfig', () => {
    it('should construct correct axios config', () => {
      // @ts-expect-error: testing private method
      const config = service.constructVerifyAxiosRequestConfig('token123');
      expect(config.method).toBe('POST');
      expect(config.url).toBe(VERIFY_URL);
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers.Authorization).toBe('Bearer token123');
      expect(config.data.state).toBe('govuk-app-health-check');
    });
  });
});
