class AuthError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

class VerifyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'VerifyError';
  }
}

class ConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export { AuthError, VerifyError, ConfigError };
