import { StatusCodes, ReasonPhrases } from 'http-status-codes';

/**
 * Options for the AppError class
 * @param statusCode - The HTTP status code to return
 * @param code - The error code to return
 * @param publicMessage - The public message to return
 * @param cause - The cause of the error (internal use)
 */
interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  publicMessage?: string;
  cause?: unknown;
}

class AppError extends Error {
  public constructor(
    message: string,
    public readonly options: AppErrorOptions = {},
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

const setTokenErrorCodes = {
  INVALID_REQUEST: 'invalid_request',
  INVALID_KEY: 'invalid_key',
  INVALID_ISSUER: 'invalid_issuer',
  INVALID_AUDIENCE: 'invalid_audience',
  AUTHENTICATION_FAILED: 'authentication_failed',
  ACCESS_DENIED: 'access_denied',
  // non-registered error codes
  INTERNAL_SERVER_ERROR: 'internal_server_error',
} as const;

const setTokenErrorDescriptions = {
  [setTokenErrorCodes.INVALID_REQUEST]:
    'The request is missing a required parameter, includes an invalid parameter value, or is otherwise malformed',
  [setTokenErrorCodes.INVALID_KEY]:
    'The key used to sign the token is invalid or has been revoked',
  [setTokenErrorCodes.INVALID_ISSUER]:
    'The token was issued by an unauthorized party',
  [setTokenErrorCodes.INVALID_AUDIENCE]:
    'The token is not intended for this service',
  [setTokenErrorCodes.AUTHENTICATION_FAILED]:
    'The token signature verification failed',
  [setTokenErrorCodes.ACCESS_DENIED]:
    'The request is not authorized to access this resource',
  [setTokenErrorCodes.INTERNAL_SERVER_ERROR]:
    'An internal server error occurred while processing the request',
} as const;

type SetTokenErrorCode =
  (typeof setTokenErrorCodes)[keyof typeof setTokenErrorCodes];

type SetTokenErrorDescription =
  (typeof setTokenErrorDescriptions)[keyof typeof setTokenErrorDescriptions];

class SETTokenError extends AppError {
  public constructor(
    cause: string,
    options: {
      statusCode?: number;
      code: SetTokenErrorCode;
      publicMessage: SetTokenErrorDescription;
      cause: string;
    },
  ) {
    super(cause, {
      statusCode: options.statusCode ?? StatusCodes.BAD_REQUEST,
      code: options.code,
      publicMessage: options.publicMessage,
      cause,
    });
  }
}

class CognitoError extends SETTokenError {
  public constructor(cause: string) {
    super(cause, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      code: setTokenErrorCodes.INTERNAL_SERVER_ERROR,
      publicMessage:
        setTokenErrorDescriptions[setTokenErrorCodes.INTERNAL_SERVER_ERROR],
      cause,
    });
  }
}

class SignatureVerificationError extends SETTokenError {
  public constructor(cause: string) {
    super(cause, {
      statusCode: StatusCodes.BAD_REQUEST,
      code: setTokenErrorCodes.AUTHENTICATION_FAILED,
      publicMessage:
        setTokenErrorDescriptions[setTokenErrorCodes.AUTHENTICATION_FAILED],
      cause,
    });
  }
}

class InvalidRequestError extends SETTokenError {
  public constructor(cause: string) {
    super(cause, {
      statusCode: StatusCodes.BAD_REQUEST,
      code: setTokenErrorCodes.INVALID_REQUEST,
      publicMessage:
        setTokenErrorDescriptions[setTokenErrorCodes.INVALID_REQUEST],
      cause,
    });
  }
}

class InvalidKeyError extends SETTokenError {
  public constructor(cause: string) {
    super(cause, {
      statusCode: StatusCodes.BAD_REQUEST,
      code: setTokenErrorCodes.INVALID_KEY,
      publicMessage: setTokenErrorDescriptions[setTokenErrorCodes.INVALID_KEY],
      cause,
    });
  }
}

export {
  SETTokenError,
  CognitoError,
  SignatureVerificationError,
  InvalidRequestError,
  InvalidKeyError,
  setTokenErrorCodes,
  setTokenErrorDescriptions,
  type SetTokenErrorCode,
  type SetTokenErrorDescription,
};
