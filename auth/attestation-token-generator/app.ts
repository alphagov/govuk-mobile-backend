/* eslint-disable importPlugin/no-extraneous-dependencies */
import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import type { App } from "firebase-admin/app";
import { initializeApp, cert } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import type { AppCheck, AppCheckToken } from "firebase-admin/app-check";
import { getClientSecret } from './secret';

const generateToken = async (appCheck: AppCheck, appId: string): Promise<AppCheckToken> => {
    return appCheck.createToken(appId, {
        ttlMillis: 3600000 // 30 minute for testing
    });
}

let cachedApp: App | null = null;
let cachedAppCheck: AppCheck | null = null;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    try {
        let requestBody;
        try {
            // Parse the JSON string from event.body into a JavaScript object
            requestBody = JSON.parse(event.body);
        } catch (error) {
            console.error("Error parsing JSON body:", error);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid JSON body provided." }),
            };
        }
        const length = (event.body != null) ? requestBody.length : 1;
        
        const maxTokens = 1000;
        if (length > maxTokens) {
            console.log("Too many tokens requested, returning 400 Bad Request");
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Too many tokens requested"
                }),
            };
        }

        if (!cachedApp) {
            const serviceAccount = await getClientSecret();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const serviceAccountKey = JSON.parse(serviceAccount);

            cachedApp = initializeApp({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                credential: cert(serviceAccountKey)
            })
        }
        const firebaseIosAppId = process.env['FIREBASE_IOS_APP_ID']!;
        if (!firebaseIosAppId) {
            throw new Error('FIREBASE_IOS_APP_ID environment variable is required');
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (!cachedAppCheck) {
            cachedAppCheck = getAppCheck(cachedApp);
        }

        const tokens: string[] = [];

        await Promise.all(Array.from({ length }, async () => {
            const { token } = await generateToken(cachedAppCheck, firebaseIosAppId);
            tokens.push(token);
        })
        );

        console.log("Generating attestation token")

        return {
            statusCode: 200,
            body: JSON.stringify({
                length: tokens.length,
                tokens,
            }),
        };


    } catch (error) {
        console.log("Error generating attestation token:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
            }),
        };
    }
};
