import { ConfigError } from "./errors";
import dotenv from "dotenv";

dotenv.config();

export interface Config {
    firebaseIosAppId: string;
    firebaseAndroidAppId: string;
}

export function getConfig(): Config {
    const firebaseIosAppId = process.env['FIREBASE_IOS_APP_ID'];
    const firebaseAndroidAppId = process.env['FIREBASE_ANDROID_APP_ID'];

    if (firebaseIosAppId == null) {
        throw new ConfigError('FIREBASE_IOS_APP_ID environment variable is required');
    }
    if (firebaseAndroidAppId == null) {
        throw new ConfigError('FIREBASE_ANDROID_APP_ID environment variable is required');
    }

    return {
        firebaseIosAppId,
        firebaseAndroidAppId,
    };
}