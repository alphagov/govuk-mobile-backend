import {
  InvocationResponse,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { TestLambdaDriver } from './testLambda.driver';

export class SharedSignalsHealthCheckDriver {
  private readonly client: TestLambdaDriver;
  healthCheckLambdaName: string;

  constructor(client: TestLambdaDriver, healthCheckLambdaName: string) {
    this.client = client;
    this.healthCheckLambdaName = healthCheckLambdaName;
  }

  public async triggerHealthCheck() {
    const response = await this.client.performAction<InvocationResponse>({
      command: new InvokeCommand({
        FunctionName: this.healthCheckLambdaName,
      }),
      service: 'LambdaClient',
      action: 'InvokeCommand',
    });

    console.log(response);
  }
}
