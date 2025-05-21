import type { JwtPayload} from 'jsonwebtoken';
import { verify, decode, JsonWebTokenError } from 'jsonwebtoken';
import type { JWK } from 'jwk-to-pem';
import jwkToPem from 'jwk-to-pem';
import { JwksFetchError, UnknownAppError } from './errors';

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

    if(!isJwks(jwksResponse)) {
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

interface ValidateFirebase {
    token: string
    firebaseAppIds: string[]
}

export const validateFirebaseJWT = async ({
    token,
    firebaseAppIds,
}: ValidateFirebase): Promise<void> => {
    const decodedTokenHeader = decode(token, { complete: true })?.header;

    if ((decodedTokenHeader?.kid) == null) {
        throw new JsonWebTokenError('JWT is missing the "kid" header');
    }

    const signingKey = await getSigningKey(decodedTokenHeader.kid);

    // eslint-disable-next-line promise/avoid-new
    const verifyPromise = new Promise<string | JwtPayload | undefined>((resolve, reject) => {
        verify(token, signingKey, {
            algorithms: ['RS256'],
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        }, (err, payload) => {
            if (err) reject(err);
            else resolve(payload);
        });
    });

    const decodedPayload = await verifyPromise;

    if(!isJwtPayload(decodedPayload)) {
        throw new JsonWebTokenError('Payload is not a valid JWT payload')
    }

    if (!isKnownApp(decodedPayload, firebaseAppIds)) {
        throw new UnknownAppError('App ID mismatch, please check subject claim includes a known app in firebase.')
    }

    console.log('Attestation token is valid');
};
