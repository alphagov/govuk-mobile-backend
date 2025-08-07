import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SecretsService } from '../../services/secrets-service';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';

vi.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: vi.fn(),
    GetSecretValueCommand: vi.fn(),
  };
});

describe('SecretsService', () => {
  let secretsService: SecretsService;
  let mockSend: Mock;

  beforeEach(() => {
    mockSend = vi.fn();
    SecretsManagerClient.prototype.send = mockSend;
    secretsService = new SecretsService('region');
  });

  it('should return parsed secret when SecretString is present', async () => {
    const secretName = 'test-secret'; //pragma: allowlist secret
    const mockSecretString = JSON.stringify({ key: 'value' });

    mockSend.mockResolvedValueOnce({
      SecretString: mockSecretString,
    } as GetSecretValueCommandOutput);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('should return Base64 string when SecretBinary is present', async () => {
    const secretName = 'test-secret'; //pragma: allowlist secret
    const mockSecretBinary = Buffer.from('binary-data').toString('base64');

    mockSend.mockResolvedValueOnce({
      SecretBinary: mockSecretBinary,
    });

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toEqual(mockSecretBinary);
  });

  it('should return undefined when neither SecretString nor SecretBinary is present', async () => {
    const secretName = 'test-secret'; //pragma: allowlist secret

    mockSend.mockResolvedValueOnce({} as GetSecretValueCommandOutput);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toBeUndefined();
  });

  it('should handle ResourceNotFoundException', async () => {
    const secretName = 'non-existent-secret'; //pragma: allowlist secret
    const error = new Error('Secret not found');
    error.name = 'ResourceNotFoundException';

    mockSend.mockRejectedValueOnce(error);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toBeUndefined();
  });

  it('should handle InvalidRequestException', async () => {
    const secretName = 'invalid-request-secret'; //pragma: allowlist secret
    const error = new Error('Invalid request');
    error.name = 'InvalidRequestException';

    mockSend.mockRejectedValueOnce(error);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toBeUndefined();
  });

  it('should handle InvalidParameterException', async () => {
    const secretName = 'invalid-parameter-secret'; //pragma: allowlist secret
    const error = new Error('Invalid parameter');
    error.name = 'InvalidParameterException';

    mockSend.mockRejectedValueOnce(error);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toBeUndefined();
  });

  it('should handle unexpected errors', async () => {
    const secretName = 'unexpected-error-secret'; //pragma: allowlist secret
    const error = new Error('Unexpected error');

    mockSend.mockRejectedValueOnce(error);

    const result = await secretsService.getSecret(secretName);

    expect(mockSend).toHaveBeenCalledWith(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    expect(result).toBeUndefined();
  });
});
