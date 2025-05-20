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

export const isJwksOrThrow = (jwks: unknown): void => {
    if (typeof jwks !== 'object' || jwks === null) {
        throw new Error('JWKS is not an object');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    if (!('keys' in jwks) || !Array.isArray((jwks as unknown as Jwks).keys)) {
        throw new Error('JWKS does not contain keys');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { keys } = (jwks as Jwks);
    for (const key of keys) {
        if (
            typeof key.kid !== 'string' ||
            (key.nbf !== undefined && typeof key.nbf !== 'number') ||
            typeof key.use !== 'string' ||
            typeof key.kty !== 'string' ||
            typeof key.e !== 'string' ||
            typeof key.n !== 'string'
        ) {
            throw new Error('JWKS contains invalid keys');
        }
    }
}