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

export {
    MissingAttestationTokenError,
    UnknownAppError,
    FailedToFetchSecretError
}