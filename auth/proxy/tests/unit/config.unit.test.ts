import { getConfig } from '../../config'
import { describe, it, expect, vi, beforeAll } from "vitest";
import { ConfigError } from '../../errors';

describe('getConfig', () => {
    beforeAll(() => {
        process.env = {
            ...process.env,
            FIREBASE_IOS_APP_ID: 'someval',
            FIREBASE_ANDROID_APP_ID: 'someval',
        }
    })
    it('should return the required environment variables', () => {
        const response = getConfig()

        expect(response.firebaseAndroidAppId).toBeDefined()
        expect(response.firebaseIosAppId).toBeDefined()
    })

    it.each([
        ['FIREBASE_IOS_APP_ID', 'FIREBASE_IOS_APP_ID environment variable is required'],
        ['FIREBASE_ANDROID_APP_ID', 'FIREBASE_ANDROID_APP_ID environment variable is required'],
    ])('should throw if variables are undefined', (key, message) => {
        const originalEnv = { ...process.env };
        delete process.env[key];

		expect(() => getConfig()).toThrow(new ConfigError(message));

        process.env = originalEnv;
    })
})