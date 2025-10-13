import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthError, VerifyError } from '../../../errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { SharedSignalHealthCheckService } from '../../../service/health-check-service';
import { sendHttpRequest } from '@libs/http-utils';

vi.mock('@aws-lambda-powertools/parameters/secrets');
vi.mock('@libs/http-utils');

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
      vi.mocked(getSecret).mockResolvedValue(undefined);
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if secret is not a string', async () => {
      vi.mocked(getSecret).mockResolvedValue({ not: 'a string' });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if sendHttpRequest response status is not OK', async () => {
      vi.mocked(getSecret).mockResolvedValue(JSON.stringify(secretsConfig));
      vi.mocked(sendHttpRequest).mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        json: () => ({}),
      });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should throw AuthError if access_token is missing', async () => {
      vi.mocked(getSecret).mockResolvedValue(JSON.stringify(secretsConfig));
      vi.mocked(sendHttpRequest).mockResolvedValue({
        status: 200,
        statusText: 'OK',
        json: () => ({}),
      });
      await expect(service.authorise()).rejects.toThrow(AuthError);
    });

    it('should return access_token on success', async () => {
      vi.mocked(getSecret).mockResolvedValue(JSON.stringify(secretsConfig));
      vi.mocked(sendHttpRequest).mockResolvedValue({
        status: 200,
        statusText: 'OK',
        json: () => ({ access_token: accessToken }),
      });
      const token = await service.authorise();
      expect(token).toBe(accessToken);
    });
  });

  describe('verify', () => {
    it('should throw VerifyError if response status is not NO_CONTENT', async () => {
      vi.mocked(sendHttpRequest).mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
      });
      await expect(service.verify('token')).rejects.toThrow(VerifyError);
    });

    it('should return true if response status is NO_CONTENT', async () => {
      vi.mocked(sendHttpRequest).mockResolvedValue({
        status: 204,
        statusText: 'No Content',
      });
      const result = await service.verify('token');
      expect(result).toBe(true);
    });
  });
});
