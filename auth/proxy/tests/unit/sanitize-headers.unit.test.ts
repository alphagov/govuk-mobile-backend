import { describe, it, expect } from 'vitest';
import { sanitizeHeaders } from '../../sanitize-headers';

describe('sanitizeHeaders', () => {
    it('should remove sensitive headers', () => {
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
            "X-Internal-Secret": "internal-value",
            "Host": "example.com"
        }

        const sanitized = sanitizeHeaders(headers);

        expect(sanitized).toEqual({}) // An empty object, as all these headers should be stripped.
    });

    it('should handle empty headers', () => {
        const headers = {};
        const sanitized = sanitizeHeaders(headers);
        expect(sanitized).toEqual({});
    });

    it('should allow whitelisted headers', () => {
        const headers = {
            'x-attestation-token': 'bar',
            'accept': 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
            'authorization': 'bearer',
            'user-agent': 'mozilla',
            'x-requested-with': 'foo',
        };
        const sanitized = sanitizeHeaders(headers);
        expect(sanitized).toEqual(headers);
    });

    it('should lower case headers', () => {
        const headers = {
            'Authorization': 'secret',
        };
        const sanitized = sanitizeHeaders(headers);
        expect(sanitized).not.toHaveProperty('Authorization');
        expect(sanitized).toHaveProperty('authorization');
    });

    it('should not mutate the original headers object', () => {
        const headers = {
            'authorization': 'secret',
            'x-header': 'value'
        };
        const copy = { ...headers };
        sanitizeHeaders(headers);
        expect(headers).toEqual(copy);
    });

    it('should prevent non-ascii characters in header values', () => {
        const headers = {
            'x-attestation-token': '𝓣𝓮𝓼𝓽', // Unicode Mathematical Script
            'accept': 'application/json✓',    // Unicode checkmark
        };
        const sanitized = sanitizeHeaders(headers);
        expect(sanitized).toEqual({});
    })
});