import type { SharedSignalsHealthCheckService } from '../service/health-check-service';

export class HealthCheckClient {
  private readonly healthCheckService: SharedSignalsHealthCheckService;

  public constructor(healthCheckService: SharedSignalsHealthCheckService) {
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
