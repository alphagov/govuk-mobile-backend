import type { JwtPayload} from 'jsonwebtoken';
import { verify, decode, JsonWebTokenError } from 'jsonwebtoken';
import type { JWK } from 'jwk-to-pem';
import jwkToPem from 'jwk-to-pem';
import { UnknownAppError } from './errors';

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

const getJwks = async (): Promise<Jwks> => {
    if (cachedJwks) {
        return cachedJwks;
    }
    const response = await fetch(JWKS_URI);
    if (!response.ok) {
        console.error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch JWKS');
    }
    cachedJwks = (await response.json()) as Jwks;
    return cachedJwks;
};

const getSigningKey = async (kid: string): Promise<string> => {
    const jwks = await getJwks();
    const signingKey = jwks.keys.find(key => key.kid === kid);
    if (!signingKey) {
        throw new JsonWebTokenError(`No matching key found for kid "${kid}"`);
    }
    return jwkToPem(signingKey as JWK);
};

const isKnownApp = (
    payload: JwtPayload,
    firebaseAppIds: string[],
) => {
    return (
        'sub' in payload &&
        typeof payload.sub === 'string' &&
        firebaseAppIds.includes(payload.sub)
    )
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

    if (!decodedTokenHeader?.kid) {
        throw new JsonWebTokenError('JWT is missing the "kid" header');
    }

    const signingKey = await getSigningKey(decodedTokenHeader.kid);

    const verifyPromise = new Promise((resolve, reject) => {
        verify(token, signingKey, {
            algorithms: ['RS256'],
        }, (err, payload) => {
            if (err) reject(err);
            else resolve(payload);
        });
    });

    const decodedPayload = await verifyPromise as JwtPayload;

    if (!isKnownApp(decodedPayload, firebaseAppIds)) {
        throw new UnknownAppError('App ID mismatch, please check subject claim includes a known app in firebase.')
    }

    console.log('Attestation token is valid');
};
