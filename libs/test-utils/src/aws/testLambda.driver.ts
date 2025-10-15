import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from '@aws-sdk/client-lambda';

interface TestLambdaPerformActionInput {
  service: string;
  action: string;
  command: unknown;
  region?: string;
}

type ErrorObject =
  | { errorType: string; errorMessage: string }
  | { errorType?: undefined; errorMessage?: undefined };

/**
 * Generic driver to proxy AWS SDK commands through a test lambda.
 */
class TestLambdaDriver {
  private readonly client: LambdaClient;
  private readonly functionName: string;

  public constructor(params: { region: string; functionName: string }) {
    this.client = new LambdaClient({ region: params.region });
    this.functionName = params.functionName;
  }

  public async performAction<T>(
    payload: TestLambdaPerformActionInput,
  ): Promise<T> {
    const response = await this.client.send(
      new InvokeCommand({
        FunctionName: this.functionName,
        Payload: JSON.stringify(payload),
        InvocationType: InvocationType.RequestResponse,
      }),
    );

    const decoder = new TextDecoder('utf-8');
    const responseString = decoder.decode(response.Payload);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const finalResponse = JSON.parse(responseString);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.handleError(finalResponse);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return finalResponse;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private handleError(response: ErrorObject): void {
    if (response.errorType != null) {
      throw new Error(response.errorMessage);
    }
  }
}

export { type TestLambdaPerformActionInput, TestLambdaDriver };
