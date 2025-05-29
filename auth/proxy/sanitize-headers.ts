

import type { APIGatewayProxyEventHeaders } from "aws-lambda";

// Only allow a whitelist of safe headers to be passed to Cognito
const allowedHeaders = [
    'content-type',
    'accept',
    'authorization',
    'user-agent',
    'x-requested-with',
    'x-attestation-token'
];

const maxHeaderValueLength = 1024; // adjust as appropriate

// cognito expects consistent casing for header names e.g. x-amz-target
// host must be removed to avoid ssl hostname unrecognised errors
export const sanitizeHeaders = (headers: APIGatewayProxyEventHeaders): APIGatewayProxyEventHeaders => {
    const firstChar = 0;
    return Object.entries(headers)
        .filter(([key]) => allowedHeaders.includes(key.toLowerCase()))
        .filter(([, value]) => {
            // Only allow ASCII characters in header values
            if (typeof value !== 'string') return false;
            // Check for non-ASCII (unicode) characters
            // eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
            return /^[\x00-\x7F]*$/.test(value);  
        })
        .reduce<Record<string, string>>((acc, [key, value]) => {
            const sanitizedValue = (value ?? '').substring(firstChar, maxHeaderValueLength);
            // Optionally, add further character validation here
            acc[key.toLowerCase()] = sanitizedValue;
            return acc;
        }, {});
}