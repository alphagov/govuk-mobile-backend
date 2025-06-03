import type { JwtPayload } from 'jsonwebtoken';
import { verify, decode, JsonWebTokenError } from 'jsonwebtoken';
import type { JWK } from 'jwk-to-pem';
import jwkToPem from 'jwk-to-pem';
import { JwksFetchError, UnknownAppError } from './errors';
import type { AppConfig } from './config';

// eslint-disable-next-line @typescript-eslint/naming-convention
const JWKS_URI = 'https://firebaseappcheck.googleapis.com/v1/jwks';

interface Key {
    kid: string;
    nbf?: number;
    use: string;
    kty: string;
    e: string;
    n: string;
}

interface Jwks {
    keys: Key[];
}

const alg = 'RS256';

let cachedJwks: Jwks | null = null;

const isJwks = (responseJson: unknown): responseJson is Jwks => {
    return (
        typeof responseJson === 'object' &&
        responseJson !== null &&
        Array.isArray((responseJson as { keys?: unknown }).keys)
    );
};

const getJwks = async (): Promise<Jwks> => {
    if (cachedJwks) {
        return cachedJwks;
    }
    const response = await fetch(JWKS_URI);
    if (!response.ok) {
        console.error(`Failed to fetch JWKS: ${String(response.status)} ${response.statusText}`);
        throw new Error('Failed to fetch JWKS');
    }
    const jwksResponse = await response.json();

    if (!isJwks(jwksResponse)) {
        throw new JwksFetchError('Jwks response is not valid Jwks')
    }

    cachedJwks = jwksResponse

    return cachedJwks;
};

const getSigningKey = async (kid: string): Promise<string> => {
    const jwks = await getJwks();
    const signingKey = jwks.keys.find(key => key.kid === kid);
    if (!signingKey) {
        throw new JsonWebTokenError(`No matching key found for kid "${kid}"`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return jwkToPem(signingKey as JWK);
};

const isKnownApp = (
    payload: JwtPayload,
    firebaseAppIds: string[],
): boolean => {
    return (
        'sub' in payload &&
        typeof payload.sub === 'string' &&
        firebaseAppIds.includes(payload.sub)
    )
}

const isJwtPayload = (payload: string | JwtPayload | undefined): payload is JwtPayload => {
    return typeof payload === 'object';
}

const isAlgorithmValid = (suppliedAlgo: string): boolean => {
    return suppliedAlgo === alg;
};

interface ValidateFirebase {
    token: string
    configValues: AppConfig
}

const hasValidIss = (
    payload: object,
    firebaseProjectNumber: string,
): payload is JwtPayload =>
    'iss' in payload &&
    typeof payload.iss === 'string' &&
    payload.iss === `https://firebaseappcheck.googleapis.com/${firebaseProjectNumber}`;

const hasCorrectAudiences = (
    payload: Record<string, unknown> | JwtPayload,
    configValues: AppConfig,
): boolean => {
    const audiences: string[] = [
        `projects/${configValues.audience}`,
        `projects/${configValues.projectId}`];

    const incomingAudience = payload.aud;

    return Array.isArray(incomingAudience)
        ? incomingAudience.some((aud: string) => audiences.includes(aud))
        : false;
}

const hasValidAud = (
    payload: object,
    configValues: AppConfig,
): payload is JwtPayload =>
    'aud' in payload
    && Array.isArray(payload.aud)
    && hasCorrectAudiences(payload, configValues);

const isKidFormatSafe = (kid: unknown): boolean => {
    if (typeof kid !== 'string') {
        return false;
    }
    // Allows alphanumeric characters, hyphens, and underscores between 5-10 characters long
    const kidRegex = /^[a-zA-Z0-9_-]{5,10}$/;
    return kidRegex.test(kid);
}

export const validateFirebaseJWT = async (values: ValidateFirebase): Promise<void> => {
    const decodedTokenHeader = decode(values.token, { complete: true })?.header;

    if ((decodedTokenHeader?.kid) == null) {
        throw new JsonWebTokenError('JWT is missing the "kid" header');
    }

    if(!isKidFormatSafe(decodedTokenHeader.kid)) {
        throw new JsonWebTokenError('"kid" header is in unsafe format');
    }

    if (!isAlgorithmValid(decodedTokenHeader.alg)) {
        throw new JsonWebTokenError(`Invalid algorithm "${decodedTokenHeader.alg}" in JWT header`);
    }

    if (decodedTokenHeader.typ !== 'JWT') {
        throw new JsonWebTokenError('JWT is missing the "typ" header or has an invalid type');
    }

    const signingKey = await getSigningKey(decodedTokenHeader.kid);

    // eslint-disable-next-line promise/avoid-new
    const verifyPromise = new Promise<string | JwtPayload | undefined>((resolve, reject) => {
        verify(values.token, signingKey, {
            algorithms: [alg],
            // eslint-disable-next-line promise/prefer-await-to-callbacks
        }, (err, payload) => {
            if (err) reject(err);
            else resolve(payload);
        });
    });

    const decodedPayload = await verifyPromise;

    if (!isJwtPayload(decodedPayload)) {
        throw new JsonWebTokenError('Payload is not a valid JWT payload')
    }

    if (!isKnownApp(decodedPayload, [values.configValues.firebaseAndroidAppId, values.configValues.firebaseIosAppId])) {
        throw new UnknownAppError('App ID mismatch, please check subject claim includes a known app in firebase.')
    }

    if (!hasValidIss(decodedPayload, values.configValues.projectId)) {
        throw new JsonWebTokenError('Invalid "iss" claim in the JWT payload');
    }

    if (!hasValidAud(decodedPayload, values.configValues)) {
        throw new JsonWebTokenError('Invalid "aud" claim in the JWT payload');
    }

    console.log('Attestation token is valid');
};


