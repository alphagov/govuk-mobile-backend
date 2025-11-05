import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request } from '@middy/core';
import { errorMiddleware } from '../../../middleware/global-error-handler';
import { logger } from '../../../logger';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { ParseError } from '@aws-lambda-powertools/parser';
import { AppError } from '../../../errors';

vi.mock('../../../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('errorMiddleware', () => {
  const mockLogger = logger as unknown as { error: vi.Mock };
  let mockRequest: Request;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      error: undefined,
      response: undefined,
    } as Request;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when no error is present', () => {
    it('should not set response when error is undefined', () => {
      mockRequest.error = undefined;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toBeUndefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should not set response when error is null', () => {
      mockRequest.error = null;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toBeUndefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('when ParseError is thrown', () => {
    it('should return 400 BAD_REQUEST for ParseError', () => {
      const parseError = new ParseError('Failed to parse API Gateway body');
      mockRequest.error = parseError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toEqual({
        statusCode: StatusCodes.BAD_REQUEST,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
        },
        body: JSON.stringify({ message: ReasonPhrases.BAD_REQUEST }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith('ParseError', {
        error: parseError,
      });
    });
  });

  describe('when UnsupportedMediaTypeError is thrown', () => {
    it('should return 400 BAD_REQUEST for UnsupportedMediaTypeError', () => {
      const unsupportedMediaTypeError = new Error('Unsupported media type');
      unsupportedMediaTypeError.name = 'UnsupportedMediaTypeError';
      mockRequest.error = unsupportedMediaTypeError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toEqual({
        statusCode: StatusCodes.BAD_REQUEST,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
        },
        body: JSON.stringify({ message: ReasonPhrases.BAD_REQUEST }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'UnsupportedMediaTypeError',
        {
          error: unsupportedMediaTypeError,
        },
      );
    });
  });

  describe('when AppError is thrown', () => {
    it('should return default values for AppError with no options', () => {
      const appError = new AppError('Generic app error');
      mockRequest.error = appError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toEqual({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
        },
        body: JSON.stringify({ message: ReasonPhrases.INTERNAL_SERVER_ERROR }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Internal Server Error', {
        error: appError,
      });
    });
  });

  describe('when generic Error is thrown', () => {
    it('should return 500 INTERNAL_SERVER_ERROR for generic Error', () => {
      const genericError = new Error('Something went wrong');
      mockRequest.error = genericError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toEqual({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
        },
        body: JSON.stringify({ message: ReasonPhrases.INTERNAL_SERVER_ERROR }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Error', {
        error: genericError,
      });
    });

    it('should return 500 INTERNAL_SERVER_ERROR for unknown error types', () => {
      const unknownError = new Error('Unknown error type');
      mockRequest.error = unknownError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockRequest.response).toEqual({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
        },
        body: JSON.stringify({ message: ReasonPhrases.INTERNAL_SERVER_ERROR }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Error', {
        error: unknownError,
      });
    });
  });

  describe('logger behavior', () => {
    it('should call logger.error with correct parameters when error exists', () => {
      const testError = new Error('Test error');
      mockRequest.error = testError;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Error', {
        error: testError,
      });
    });

    it('should not call logger.error when no error is present', () => {
      mockRequest.error = undefined;

      const middleware = errorMiddleware();
      middleware.onError(mockRequest);

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
