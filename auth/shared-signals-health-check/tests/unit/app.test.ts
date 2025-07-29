import { describe, beforeEach, vi, it, expect } from 'vitest';

describe('Unit test for shared-signals-health-check lambdaHandler', () => {
  const mockEvent = {
    id: 'test-event-id',
    time: '2024-06-01T00:00:00Z',
  } as any;

  let healthCheckClientMock: any;
  let HealthCheckClientSpy: any;
  let initialiseHealthCheckServiceSpy: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    healthCheckClientMock = {
      performHealthCheck: vi.fn().mockResolvedValue(undefined),
    };

    HealthCheckClientSpy = vi
      .fn()
      .mockImplementation(() => healthCheckClientMock);
    initialiseHealthCheckServiceSpy = vi.fn().mockReturnValue({});

    vi.doMock(
      '../../../shared-signals-health-check/client/health-check-client',
      () => ({
        HealthCheckClient: HealthCheckClientSpy,
      }),
    );

    vi.doMock('../../../shared-signals-health-check/init', () => ({
      initialiseHealthCheckService: initialiseHealthCheckServiceSpy,
    }));

    vi.doMock('../../../shared-signals-health-check/log-messages', () => ({
      logMessages: {
        HEALTH_CHECK_START: 'Health check started',
        HEALTH_CHECK_END: 'Health check ended',
        CONFIG_ERROR: 'Config error',
        AUTH_ERROR: 'Auth error',
        VERIFY_ERROR: 'Verify error',
        ERROR_UNHANDLED: 'Unhandled error',
      },
    }));

    vi.doMock('../../../shared-signals-health-check/errors', () => ({
      ConfigError: class ConfigError extends Error {},
      AuthError: class AuthError extends Error {},
      VerifyError: class VerifyError extends Error {},
    }));
  });

  it('Should log start and end messages and perform health check', async () => {
    const consoleInfoMock = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const { lambdaHandler } = await import(
      '../../../shared-signals-health-check/app'
    );

    await lambdaHandler(mockEvent);

    expect(consoleInfoMock).toHaveBeenCalledWith('Health check started', {
      eventId: mockEvent.id,
      eventTime: mockEvent.time,
    });
    expect(HealthCheckClientSpy).toHaveBeenCalled();
    expect(healthCheckClientMock.performHealthCheck).toHaveBeenCalled();
    expect(consoleInfoMock).toHaveBeenCalledWith('Health check ended', {
      eventId: mockEvent.id,
      eventTime: mockEvent.time,
    });
  });

  it('Should log config error if ConfigError is thrown', async () => {
    const { lambdaHandler } = await import(
      '../../../shared-signals-health-check/app'
    );
    const { ConfigError } = await import(
      '../../../shared-signals-health-check/errors'
    );
    healthCheckClientMock.performHealthCheck.mockRejectedValue(
      new ConfigError('Config error'),
    );
    const consoleErrorMock = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await lambdaHandler(mockEvent);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Config error',
      expect.any(ConfigError),
    );
  });

  it('Should log auth error if AuthError is thrown', async () => {
    const { lambdaHandler } = await import(
      '../../../shared-signals-health-check/app'
    );
    const { AuthError } = await import(
      '../../../shared-signals-health-check/errors'
    );
    healthCheckClientMock.performHealthCheck.mockRejectedValue(
      new AuthError('Auth error'),
    );
    const consoleErrorMock = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await lambdaHandler(mockEvent);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Auth error',
      expect.any(AuthError),
    );
  });

  it('Should log verify error if VerifyError is thrown', async () => {
    const { lambdaHandler } = await import(
      '../../../shared-signals-health-check/app'
    );
    const { VerifyError } = await import(
      '../../../shared-signals-health-check/errors'
    );
    healthCheckClientMock.performHealthCheck.mockRejectedValue(
      new VerifyError('Verify error'),
    );
    const consoleErrorMock = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await lambdaHandler(mockEvent);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Verify error',
      expect.any(VerifyError),
    );
  });

  it('Should log unhandled error for unknown error', async () => {
    const { lambdaHandler } = await import(
      '../../../shared-signals-health-check/app'
    );
    healthCheckClientMock.performHealthCheck.mockRejectedValue(
      new Error('Unknown error'),
    );
    const consoleErrorMock = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await lambdaHandler(mockEvent);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Unhandled error',
      expect.any(Error),
    );
  });
});
