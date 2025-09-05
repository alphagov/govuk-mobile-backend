import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request } from '@middy/core';
import { errorMiddleware } from '../../../middleware/global-error-handler';
import { logger } from '../../../logger';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { ParseError } from '@aws-lambda-powertools/parser';

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
      const parseError = new ParseError('Invalid JSON');
      mockRequest.error = parseError;

      const middleware = errorMiddleware();
      expect(() => middleware.onError(mockRequest)).toThrow('Unauthorized');
    });
  });

  describe('logger behavior', () => {
    it('should call logger.error with correct parameters when error exists', () => {
      const testError = new Error('Test error');
      mockRequest.error = testError;

      const middleware = errorMiddleware();
      expect(() => middleware.onError(mockRequest)).toThrow('Unauthorized');

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
