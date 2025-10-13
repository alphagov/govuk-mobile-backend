import type { SharedSignalHealthCheckService } from '../service/health-check-service';

export class HealthCheckClient {
  private readonly healthCheckService: SharedSignalHealthCheckService;

  public constructor(healthCheckService: SharedSignalHealthCheckService) {
    this.healthCheckService = healthCheckService;
  }

  public async performHealthCheck(): Promise<boolean> {
    const token = await this.healthCheckService.authorise();
    const isVerified = await this.healthCheckService.verify(token);
    return isVerified;
  }
}
