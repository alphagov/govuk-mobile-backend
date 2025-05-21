class MissingAttestationTokenError extends Error {
    public constructor(message: string) {
        super(message)
        this.name = 'MissingAttestationTokenError'; 
    }
}

class UnknownAppError extends Error {
    public constructor(message: string) {
        super(message)
        this.name = 'UnknownAppError';
    }
}

class FailedToFetchSecretError extends Error {
    public constructor(message: string) {
        super(message)
        this.name = 'FailedToFetchSecretError';
    }
}

class JwksFetchError extends Error {
    public constructor(message: string) {
        super(message)
        this.name = 'JwksFetchError';
    }
}

export {
    MissingAttestationTokenError,
    UnknownAppError,
    FailedToFetchSecretError,
    JwksFetchError
}