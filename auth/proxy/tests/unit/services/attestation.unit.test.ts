import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    validateAttestationHeaderOrThrow,
    MissingAttestationTokenError
} from "../../../services";

const validateFirebaseMock = vi.fn();
vi.mock('../../../services/firebaseJwt', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('../../../services/firebaseJwt')>();

    return {
        ...originalModule, // Include all original exports
        validateFirebaseJWT: vi.fn(() => validateFirebaseMock()),
    };
});

describe('attestation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockConfig = (overrides?: any) => ({
        ...process.env,
        ...overrides
    });

    const attestationTokenHeaderName = 'X-Attestation-Token';

    it('should not validate attestation token if the path is not the token endpoint', async () => {
        await expect(validateAttestationHeaderOrThrow({
            [attestationTokenHeaderName]: 'Bad-Token'
        }, '/jwks', mockConfig()))
            .resolves
            .not
            .toThrow();
    })

    it('should throw missing attestation token header if no header provided', async () => {
        await expect(validateAttestationHeaderOrThrow({}, '/token', mockConfig()))
            .rejects
            .toThrow(MissingAttestationTokenError);
    })

    it('should return void for valid attestation checks', async () => {
        await expect(validateAttestationHeaderOrThrow({
            [attestationTokenHeaderName]: 'valid-token'
        }, '/token', mockConfig()))
            .resolves
            .not
            .toThrow();
    })

    it('should allow case insensitive headers', async () => {
        await expect(validateAttestationHeaderOrThrow({
            'x-attestation-token': 'valid-token'
        }, '/token', mockConfig()))
            .resolves
            .not
            .toThrow();
    })

    it('should throw if attestation check fails', async () => {
        validateFirebaseMock.mockImplementationOnce(() => {
            throw new Error('Invalid token');
        });

        await expect(
            validateAttestationHeaderOrThrow({
                [attestationTokenHeaderName]: 'Bad-Token'
            }, '/token', mockConfig())
        ).rejects.toThrow('Invalid token');
    });
})
