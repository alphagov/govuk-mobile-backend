import type { SharedSignalHealthCheckService } from '../service/health-check-service';

export class HealthCheckClient {
  private readonly healthCheckService: SharedSignalHealthCheckService;

  public constructor(healthCheckService: SharedSignalHealthCheckService) {
    this.healthCheckService = healthCheckService;
  }

  public async performHealthCheck(): Promise<boolean> {
    try {
      let isVerified = false;
      const token = await this.healthCheckService.authorise();
      isVerified = await this.healthCheckService.verify(token);
      return isVerified;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
