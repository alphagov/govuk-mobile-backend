import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialiseHealthCheckService } from '../../init';
import { HealthCheckClient } from '../../../shared-signal-health-check/client/health-check-client';
import { lambdaHandler } from '../../app';
import { AuthError, ConfigError, VerifyError } from '../../errors';
import { logMessages } from '../../log-messages';
import { logger } from '../../logger';
import type { Context } from 'aws-lambda';

vi.mock('../../../shared-signal-health-check/client/health-check-client');
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
    vi.resetModules();
    (initialiseHealthCheckService as unknown as vi.Mock).mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('Should perform health check and log start/end messages', async () => {
    const performHealthCheckMock = vi.fn().mockResolvedValue(undefined);
    (HealthCheckClient as unknown as vi.Mock).mockImplementation(() => ({
      performHealthCheck: performHealthCheckMock,
    }));

    await lambdaHandler(mockEvent as any, mockContext);

    expect(loggerInfoMock).toHaveBeenCalledWith(
      logMessages.HEALTH_CHECK_START,
      {
        eventId: mockEvent.id,
      },
    );
    expect(performHealthCheckMock).toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith(logMessages.HEALTH_CHECK_END, {
      eventId: mockEvent.id,
    });
  });

  it('Should handle ConfigError and log config error', async () => {
    (HealthCheckClient as unknown as vi.Mock).mockImplementation(() => ({
      performHealthCheck: vi
        .fn()
        .mockRejectedValue(new ConfigError('Config error')),
    }));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      ConfigError,
    );
  });

  it('Should handle AuthError and log auth error', async () => {
    (HealthCheckClient as unknown as vi.Mock).mockImplementation(() => ({
      performHealthCheck: vi
        .fn()
        .mockRejectedValue(new AuthError('Auth error')),
    }));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      AuthError,
    );
  });

  it('Should handle VerifyError and log verify error', async () => {
    (HealthCheckClient as unknown as vi.Mock).mockImplementation(() => ({
      performHealthCheck: vi
        .fn()
        .mockRejectedValue(new VerifyError('Verify error')),
    }));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      VerifyError,
    );
  });

  it('Should handle unknown error and log unhandled error', async () => {
    const unknownError = new Error('Unknown error');
    (HealthCheckClient as unknown as vi.Mock).mockImplementation(() => ({
      performHealthCheck: vi.fn().mockRejectedValue(unknownError),
    }));

    await expect(lambdaHandler(mockEvent as any, mockContext)).rejects.toThrow(
      unknownError,
    );
  });
});
