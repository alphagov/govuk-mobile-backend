export class MissingAttestationTokenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'MissingAttestationTokenError'; 
    }
}

export class UnknownAppError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'UnknownAppError';
    }
}
