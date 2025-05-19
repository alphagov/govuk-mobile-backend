import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClientSecret } from "../../secret";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

describe('secret', () => {
    const mockClient = {
        send: vi.fn().mockResolvedValue({
            SecretString: JSON.stringify({
                client_secret: 'mock-client-secret' // pragma: allowlist secret
            })
        })
    } as unknown as SecretsManagerClient;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.COGNITO_SECRET_NAME = 'mock-secret-name'; // pragma: allowlist secret
    })

    it('should throw error if secret name is not provided', async () => { 
        process.env.COGNITO_SECRET_NAME = '';

        await expect(getClientSecret(
            mockClient
        )).rejects.toThrow('Secret name is not provided');
    })

    it('should fetch client secret from AWS Secrets Manager', async () => {
        await expect(getClientSecret(
            mockClient,
            null
        ))
            .resolves
            .toEqual('mock-client-secret');
    })

    it('should use cached client secret', async () => { 
        await getClientSecret(mockClient, null);
        await getClientSecret(mockClient);

        expect(mockClient.send).toHaveBeenCalledTimes(1);
    })

    it('should throw error if secret is empty', async () => { 
        const emptySecret = {
            send: vi.fn().mockResolvedValue({
                SecretString: ''
            })
        } as unknown as SecretsManagerClient;

        await expect(getClientSecret(
            emptySecret,
            null
        ))
            .rejects
            .toThrow('SecretString is empty or undefined.');
    })

    it('should throw error if client_secret is empty', async () => { 
        const emptyClientSecret = {
            send: vi.fn().mockResolvedValue({
                SecretString: JSON.stringify({
                    client_secret: '',
                })
            })
        } as unknown as SecretsManagerClient;

        await expect(getClientSecret(
            emptyClientSecret,
            null
        )).rejects.toThrow('client_secret is empty or undefined.');
    })

    it('should throw error if fetching secret fails', async () => {
        const unknownError = {
            send: vi.fn().mockRejectedValue(new Error('Failed to fetch secret'))
        } as unknown as SecretsManagerClient;

        await expect(getClientSecret(
            unknownError,
            null
        )).rejects.toThrow('Failed to fetch secret');
     })
})