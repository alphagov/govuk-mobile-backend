class CognitoError extends Error {
  public constructor() {
    super();
    this.name = 'CognitoError';
  }
}

class SignatureVerificationError extends Error {
  public constructor() {
    super();
    this.name = 'SignatureVerificationError';
  }
}

export { CognitoError, SignatureVerificationError };
