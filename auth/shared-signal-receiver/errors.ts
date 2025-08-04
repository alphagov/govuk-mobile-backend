class CognitoError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

class SignatureVerificationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SignatureVerificationError';
  }
}

export { CognitoError, SignatureVerificationError };
