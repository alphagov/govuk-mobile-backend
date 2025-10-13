import { StatusCodes, ReasonPhrases } from 'http-status-codes';

class AppError extends Error {
  public constructor(
    message: string,
    public readonly options: {
      statusCode?: number;
      code?: string;
      publicMessage?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = options.code ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
  }

  public get statusCode(): number {
    return this.options.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  }
  public get publicMessage(): string {
    return this.options.publicMessage ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
  }
}

class UnknownAppError extends AppError {
  public constructor(
    publicMessage = 'Unknown app associated with attestation token',
    details?: unknown,
  ) {
    super(publicMessage, {
      publicMessage,
      cause: details,
      statusCode: StatusCodes.UNAUTHORIZED,
    });
    this.name = 'UnknownAppError';
  }
}

class FailedToFetchSecretError extends AppError {
  public constructor(
    publicMessage = 'Internal server error, server missing key dependencies',
    details?: unknown,
  ) {
    super(publicMessage, {
      publicMessage,
      cause: details,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    this.name = 'FailedToFetchSecretError';
  }
}

class ConfigError extends AppError {
  public constructor(publicMessage = 'Config error', details?: unknown) {
    super(publicMessage, {
      publicMessage,
      cause: details,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
    this.name = 'ConfigError';
  }
}

class JwtError extends AppError {
  public constructor(publicMessage = 'JWT error', details?: unknown) {
    super(publicMessage, {
      publicMessage,
      cause: details,
      statusCode: StatusCodes.UNAUTHORIZED,
    });
    this.name = 'JwtError';
  }
}

export {
  AppError,
  UnknownAppError,
  FailedToFetchSecretError,
  ConfigError,
  JwtError,
};
