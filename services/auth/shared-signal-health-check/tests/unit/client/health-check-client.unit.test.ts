import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheckClient } from '../../../client/health-check-client';
import { SharedSignalHealthCheckService } from '../../../service/health-check-service';

describe('HealthCheckClient', () => {
  let healthCheckServiceMock: SharedSignalHealthCheckService;
  let client: HealthCheckClient;

  beforeEach(() => {
    healthCheckServiceMock = {
      authorise: vi.fn(),
      verify: vi.fn(),
    } as unknown as SharedSignalHealthCheckService;
    client = new HealthCheckClient(healthCheckServiceMock);
  });

  it('should return true when health check is successful', async () => {
    (healthCheckServiceMock.authorise as any).mockResolvedValue('token123');
    (healthCheckServiceMock.verify as any).mockResolvedValue(true);

    const result = await client.performHealthCheck();
    expect(healthCheckServiceMock.authorise).toHaveBeenCalled();
    expect(healthCheckServiceMock.verify).toHaveBeenCalledWith('token123');
    expect(result).toBe(true);
  });

  it('should return false when verify returns false', async () => {
    (healthCheckServiceMock.authorise as any).mockResolvedValue('token123');
    (healthCheckServiceMock.verify as any).mockResolvedValue(false);

    const result = await client.performHealthCheck();
    expect(result).toBe(false);
  });

  it('should return false and log error if authorise throws', async () => {
    const error = new Error('Auth error');
    (healthCheckServiceMock.authorise as any).mockRejectedValue(error);

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const result = await client.performHealthCheck();
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', error);
    consoleErrorSpy.mockRestore();
  });

  it('should return false and log error if verify throws', async () => {
    (healthCheckServiceMock.authorise as any).mockResolvedValue('token123');
    const error = new Error('Verify error');
    (healthCheckServiceMock.verify as any).mockRejectedValue(error);

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const result = await client.performHealthCheck();
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', error);
    consoleErrorSpy.mockRestore();
  });
});
