import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export class SSMService {
  private ssmClient: SSMClient;

  public constructor(region: string) {
    this.ssmClient = new SSMClient({ region });
  }

  public async getParameterValue(parameterName: string): Promise<string> {
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      });
      const response = await this.ssmClient.send(command);

      const value = response.Parameter?.Value;

      if (value === undefined) {
        throw new Error(
          `Parameter ${parameterName} not found or has no value.`,
        );
      }

      return value;
    } catch (error) {
      console.error(`Error fetching parameter ${parameterName}:`, error);
      throw error;
    }
  }
}
