import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAttestationHeaderOrThrow } from "../../attestation";
import { MissingAttestationTokenError } from "../../errors";

const verifyTokenMock = vi.fn();

vi.mock('firebase-admin/app-check', () => {
    return {
        getAppCheck: () => ({
            verifyToken: verifyTokenMock.mockResolvedValue({
                token: 'mocked-token',
                appId: 'mocked-app-id',
                ttlMillis: 3600000,
            }),
        }),
    };
});

describe('attestation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not validate attestation token if the path is not the token endpoint', async () => {
        await expect(validateAttestationHeaderOrThrow({
            'Attestation-Token': 'Bad-Token'
        }, '/jwks'))
            .resolves
            .not
            .toThrow()
    })

    it('should throw missing attestation token header if no header provided', async () => {
        await expect(validateAttestationHeaderOrThrow({}, '/token'))
            .rejects
            .toThrow(MissingAttestationTokenError)
    })

    it('should return void for valid attesation checks', async () => {
        await expect(validateAttestationHeaderOrThrow({
            'Attestation-Token': 'valid-token'
        }, '/token'))
            .resolves
            .not
            .toThrow()
    })

    it('should allow case insensitive headers', async () => {
        await expect(validateAttestationHeaderOrThrow({
            'attestation-token': 'valid-token'
        }, '/token'))
            .resolves
            .not
            .toThrow()
    })


    it('should throw if attestation check fails', async () => {
        verifyTokenMock.mockRejectedValueOnce(new Error('Invalid token'));

        await expect(
            validateAttestationHeaderOrThrow({
                'Attestation-Token': 'Bad-Token'
            }, '/token')
        ).rejects.toThrow('Invalid token');
    });
})