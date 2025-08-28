class UnknownAppError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'UnknownAppError';
  }
}

class FailedToFetchSecretError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'FailedToFetchSecretError';
  }
}

class JwksFetchError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'JwksFetchError';
  }
}

class ConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export {
  UnknownAppError,
  FailedToFetchSecretError,
  JwksFetchError,
  ConfigError,
};
