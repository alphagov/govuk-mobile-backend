/* eslint-disable importPlugin/group-exports */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { JwksFetchError } from "./errors";

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

interface JwksCache {
    jwks: Jwks;
    expiresInMillis: number
}

const isJwks = (responseJson: unknown): responseJson is Jwks => {
    return (
        typeof responseJson === 'object' &&
        responseJson !== null &&
        Array.isArray((responseJson as { keys?: unknown }).keys)
    );
};

let cachedJwks: JwksCache | null = null;

interface Jwks {
    keys: Key[];
}

// eslint-disable-next-line importPlugin/group-exports
export const getJwks = async (): Promise<Jwks> => {
    let now = Date.now();

    // Check if cachedJwks exists and is still fresh based on its maxAge
    if (cachedJwks && (now < cachedJwks.expiresInMillis)) {
        console.log('Returning JWKS from cache (still fresh).');
        return cachedJwks.jwks;
    }

    const response = await fetch(JWKS_URI);

    if (!response.ok) {
        console.error(`Failed to fetch JWKS: ${String(response.status)} ${response.statusText}`);
        throw new Error('Failed to fetch JWKS');
    }

    const jwksResponse = await response.json();

    if (!isJwks(jwksResponse)) {
        throw new JwksFetchError('Jwks response is not valid Jwks');
    }

    // Get max-age from cache-control header
    const cacheControlHeader = response.headers.get('cache-control');
    let maxAgeInSeconds = 6 * 60 * 60;  //defaulting to six hours in seconds
    if (cacheControlHeader != undefined) {
        const match = /max-age=(\d+)/.exec(cacheControlHeader);  //reading value e.g. public, max-age=21600
        if (match?.[1] != null) {
            maxAgeInSeconds = parseInt(match[1], 10);
        }
    }

    now = Date.now();
    const expiry = now + maxAgeInSeconds * 1000; //in milliseconds

    cachedJwks = {
        jwks: jwksResponse,
        expiresInMillis: expiry
    };

    console.log('Fetching fresh JWKS (cache expired or not present)...new cache generated');

    return cachedJwks.jwks;
};


//Only for testing purposes due to singleton nature of the object
export const _clearCachedJwks = (): void => { 
    cachedJwks = null;
}

export const _returnCachedJwks = (): JwksCache | null => {
    return cachedJwks;
}






