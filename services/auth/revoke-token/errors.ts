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
  public get code(): string {
    return this.options.code ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
  }
  public get publicMessage(): string {
    return this.options.publicMessage ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
  }
}

class InvalidParameterError extends AppError {
  public constructor(publicMessage = 'Invalid request', details?: unknown) {
    super('Validation failed', {
      statusCode: StatusCodes.BAD_REQUEST,
      code: ReasonPhrases.BAD_REQUEST,
      publicMessage,
      cause: details,
    });
  }
}

class NotAuthorizedError extends AppError {
  public constructor(publicMessage = 'Not authorized') {
    super('Not authorized', {
      statusCode: StatusCodes.UNAUTHORIZED,
      code: ReasonPhrases.UNAUTHORIZED,
      publicMessage,
    });
  }
}

class TooManyRequestsError extends AppError {
  public constructor(cause: unknown) {
    super('Too many requests', {
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      code: ReasonPhrases.TOO_MANY_REQUESTS,
      publicMessage: 'Too many requests',
      cause,
    });
  }
}

export {
  AppError,
  InvalidParameterError,
  NotAuthorizedError,
  TooManyRequestsError,
};
