import { ConfigError } from "./errors";
import dotenv from "dotenv";

dotenv.config();

const validateCognitoUrl = (url: string): URL => {
    try {
        const parsedUrl = new URL(url)

        if (parsedUrl.protocol !== 'https:') {
            throw new ConfigError('Only https Cognito URLs are allowed')
        }

        return parsedUrl
    } catch (error) {
        if (error instanceof Error) {
            throw new ConfigError(error.message);
        }
        throw new ConfigError(String(error));
    }
}

export interface AppConfig {
    firebaseIosAppId: string;
    firebaseAndroidAppId: string;
    cognitoUrl: URL;
    projectId: string;
    audience: string;
}

export function getConfig(): AppConfig {
    const firebaseIosAppId = process.env['FIREBASE_IOS_APP_ID'];
    const firebaseAndroidAppId = process.env['FIREBASE_ANDROID_APP_ID'];
    const cognitoUrl = process.env['COGNITO_URL'];
    const projectId = process.env['FIREBASE_PROJECT_ID'];
    const audience = process.env['FIREBASE_AUDIENCE'];

    if (firebaseIosAppId == null) {
        throw new ConfigError('FIREBASE_IOS_APP_ID environment variable is required');
    }

    if (firebaseAndroidAppId == null) {
        throw new ConfigError('FIREBASE_ANDROID_APP_ID environment variable is required');
    }

    if (cognitoUrl == null) {
        throw new ConfigError('COGNITO_URL environment variable is required');
    }

    const sanitizedUrl = validateCognitoUrl(cognitoUrl);

    if (projectId == null) {
        throw new ConfigError('FIREBASE_PROJECT_ID environment variable is required');
    }
    if (audience == null) {
        throw new ConfigError('FIREBASE_AUDIENCE environment variable is required');
    }

    return {
        firebaseIosAppId,
        firebaseAndroidAppId,
        cognitoUrl: sanitizedUrl,
        projectId,
        audience,
    }
};
