class CognitoError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

class SignatureVerificationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'signature_verification_error';
  }
}

class InvalidRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'invalid_request';
  }
}

class InvalidKeyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'invalid_key';
  }
}

export {
  CognitoError,
  SignatureVerificationError,
  InvalidRequestError,
  InvalidKeyError,
};
