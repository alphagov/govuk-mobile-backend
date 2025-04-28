export class MissingAttestationTokenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'MissingAttestationTokenError'; 
    }
}

export class InvalidAttestationTokenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InvalidAttestationTokenError';
    }
}

export class AttestationTokenExpiredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AttestationTokenExpiredError';
    }
}