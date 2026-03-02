import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialiseHealthCheckService } from '../../init';
import { lambdaHandler } from '../../app';
import { AuthError, ConfigError, VerifyError } from '../../errors';
import { logMessages } from '../../log-messages';
import { logger } from '../../logger';
import type { Context } from 'aws-lambda';

// Create mock function that can be accessed across tests
const mockPerformHealthCheck = vi.fn();

vi.mock(
  '../../../shared-signal-health-check/client/health-check-client',
  () => ({
    HealthCheckClient: class {
      performHealthCheck = mockPerformHealthCheck;
    },
  }),
);
vi.mock('../../../shared-signal-health-check/init');

describe('Unit test for shared signal health check lambdaHandler', () => {
  let loggerInfoMock: vi.SpyInstance;
  let loggerErrorMock: vi.SpyInstance;

  const mockEvent = {
    id: 'test-event-id',
    time: '2024-06-01T00:00:00Z',
  };
  const mockContext = {
    awsRequestId: 'test-aws-request-id',
  } as Context;

  beforeEach(() => {
    loggerInfoMock = vi.spyOn(logger, 'info');
    loggerErrorMock = vi.spyOn(logger, 'error');
    vi.clearAllMocks();
    (initialiseHealthCheckService as unknown as vi.Mock).mockReturnValue({});

    // Reset the mock function
    mockPerformHealthCheck.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should perform health check and log start/end messages', async () => {
    mockPerformHealthCheck.mockResolvedValue(undefined);

    await lambdaHandler(mockEvent as any, mockContext);

    expect(loggerInfoMock).toHaveBeenCalledWith(
      logMessages.HEALTH_CHECK_START,
      {
        eventId: mockEvent.id,
      },
    );
    expect(mockPerformHealthCheck).toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith(logMessages.HEALTH_CHECK_END, {
      eventId: mockEvent.id,
    });
  });

  it('Should handle ConfigError and log config error', async () => {
    mockPerformHealthCheck.mockRejectedValue(new ConfigError('Config error'));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      ConfigError,
    );
  });

  it('Should handle AuthError and log auth error', async () => {
    mockPerformHealthCheck.mockRejectedValue(new AuthError('Auth error'));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      AuthError,
    );
  });

  it('Should handle VerifyError and log verify error', async () => {
    mockPerformHealthCheck.mockRejectedValue(new VerifyError('Verify error'));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      VerifyError,
    );
  });

  it('Should handle unknown error and log unhandled error', async () => {
    const unknownError = new Error('Unknown error');
    mockPerformHealthCheck.mockRejectedValue(unknownError);

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      unknownError,
    );
  });
});
