import { getConfig } from '../../config'
import { describe, it, expect, vi, beforeAll } from "vitest";
import { ConfigError } from '../../errors';

describe('getConfig', () => {
    beforeAll(() => {
        process.env = {
            ...process.env,
            FIREBASE_IOS_APP_ID: 'someval',
            FIREBASE_ANDROID_APP_ID: 'someval',
            COGNITO_URL: 'https://www.govukapp.com'
        }
    })
    it('should return the required environment variables', () => {
        const response = getConfig()

        expect(response.firebaseAndroidAppId).toBeDefined()
        expect(response.firebaseIosAppId).toBeDefined()
        expect(response.cognitoUrl).toBeDefined()
    })

    it.each([
        ['FIREBASE_IOS_APP_ID', 'FIREBASE_IOS_APP_ID environment variable is required'],
        ['FIREBASE_ANDROID_APP_ID', 'FIREBASE_ANDROID_APP_ID environment variable is required'],
        ['COGNITO_URL', 'COGNITO_URL environment variable is required'],
    ])('should throw if variables are undefined', (key, message) => {
        const originalEnv = { ...process.env };
        delete process.env[key];

		expect(() => getConfig()).toThrow(new ConfigError(message));

        process.env = originalEnv;
    })

    it.each([
        ['192.168.1.1', 'Invalid URL'],
        ['http://example.com', 'Only https Cognito URLs are allowed'],
        ['', 'Invalid URL']
    ])('should throw if cognito url is invalid', (url, message) => {
        const originalEnv = { ...process.env };
        process.env['COGNITO_URL'] = url;

		expect(() => getConfig()).toThrow(new ConfigError(message));

        process.env = originalEnv;
    })
})