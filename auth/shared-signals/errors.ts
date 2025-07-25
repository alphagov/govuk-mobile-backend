class CognitoError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

export { CognitoError };
