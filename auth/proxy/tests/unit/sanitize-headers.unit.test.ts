import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { sanitizeHeaders } from '../../sanitize-headers';
import { ZodError } from 'zod/v4';

vi.mock('../../feature-flags', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('../../feature-flags')>();
    return {
        ...originalModule, // Include all original exports
        ATTESTATION: true,
        FEATURE_FLAGS: {
            ATTESTATION: true, // Or false, depending on your test case
        },
    };
});

describe('sanitizeHeaders', () => {
    const validHeaders = {
        "content-type": "application/x-www-form-urlencoded",
        "x-attestation-token": "foobar",
    }

    it('should remove non-recognised headers', async () => {
        const headers = {
            "X-Forwarded-Host": "malicious.com",
            "X-Original-Host": "attacker.net",
            "X-Real-IP": "192.168.1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.SignUp",
            "X-Amz-Security-Token": "some-token",
            "Origin": "http://evil.org",
            "Referrer": "http://phishing.com/page",
            "X-Original-URL": "/admin/login",
            "X-Rewrite-URL": "/api/v1/auth",
            "X-HTTP-Method-Override": "PUT",
            "Host": "example.com",
        }

        await expect(sanitizeHeaders({
            ...headers,
            ...validHeaders
        }))
            .resolves
            .toEqual(validHeaders) // An empty object, as all these headers should be stripped.
    });

    it.each([
        'application/json',
        'application/x-www-form-urlencoded',
        "application/x-www-form-urlencoded; charset=UTF-8"
    ])('should allow specific content-type headers', async (contentType) => {
        await expect(sanitizeHeaders({
            ...validHeaders,
            'Content-Type': contentType,
        }))
            .resolves
    })

    it('should allow whitelisted headers', async () => {
        const headers = {
            ...validHeaders,
            'accept': 'application/json',
            'user-agent': 'mozilla',
            'connection': 'keep-alive'
        };
        const sanitized = await sanitizeHeaders(headers);
        expect(sanitized).toEqual(headers);
    });

    it('should lower case headers', async () => {
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Attestation-Token": "foobar",
        };
        const sanitized = await sanitizeHeaders(headers);

        expect(sanitized).not.toHaveProperty('Content-Type');
        expect(sanitized).toHaveProperty('content-type');
        expect(sanitized).not.toHaveProperty('X-Attestation-Token');
        expect(sanitized).toHaveProperty('x-attestation-token');
    });

    it('should not mutate the original headers object', async () => {
        const copy = { ...validHeaders };
        await sanitizeHeaders(validHeaders);
        expect(validHeaders).toEqual(copy);
    });

    it.each([
        [
            {
                ...validHeaders,
                'x-attestation-token': '𝓣𝓮𝓼𝓽',
            }
        ],
        [
            {
                ...validHeaders,
                'content-type': '𝓣𝓮𝓼𝓽',
            },
        ],
    ])
        ('should prevent non-ascii characters in header values', async (headers) => {
            await expect(sanitizeHeaders(headers as any))
                .rejects
                .toThrowError(ZodError)
        })

    describe('when ATTESTATION feature flag is DISABLED', () => {
        beforeAll(() => {
            vi.doUnmock('../../feature-flags');
            vi.doMock('../../feature-flags', () => ({
                FEATURE_FLAGS: {
                    ATTESTATION: false, // Feature flag DISABLED
                },
            }));
            vi.resetModules();
        });

        afterAll(() => {
            vi.restoreAllMocks(); 
        });

        it('should NOT require x-attestation-token when feature flag is DISABLED', async () => {
            // IMPORTANT: Re-import sanitizeHeaders inside this describe block
            // because we reset the modules cache with vi.resetModules().
            const { sanitizeHeaders: disabledSanitizeHeaders } = await import('../../sanitize-headers');

            const headersWithoutToken = {
                "content-type": "application/x-www-form-urlencoded",
            };

            // Feature flag DISABLED: missing x-attestation-token should now pass
            await expect(
                disabledSanitizeHeaders(headersWithoutToken)
            ).resolves.toEqual(headersWithoutToken);
        });

        it('should still allow x-attestation-token if present when DISABLED', async () => {
             const { sanitizeHeaders: disabledSanitizeHeaders } = await import('../../sanitize-headers');

             const headersWithToken = {
                 "content-type": "application/x-www-form-urlencoded",
                 "x-attestation-token": "foobar",
             };

             // Feature flag DISABLED: present x-attestation-token should still pass
             await expect(
                 disabledSanitizeHeaders(headersWithToken)
             ).resolves.toEqual({
                 "content-type": "application/x-www-form-urlencoded",
             });
        });
    });
});