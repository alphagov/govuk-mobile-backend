import {
  FilterLogEventsCommand,
  FilterLogEventsResponse,
} from '@aws-sdk/client-cloudwatch-logs';
import { TestLambdaDriver } from './testLambda.driver';

/**
 * Options for finding a log message in CloudWatch with retries.
 * @property logGroupName - The name of the CloudWatch log group.
 * @property searchString - The string to search for within the log messages.
 * @property filterPattern - (Optional) A filter pattern to narrow down the search.
 * @property retries - (Optional) Number of retry attempts. Default is 5.
 * @property delayMs - (Optional) Delay in milliseconds between retries. Default is 2000ms.
 * @property startTime - (Optional) The start of the time range, in milliseconds since epoch.
 * @property endTime - (Optional) The end of the time range, in milliseconds since epoch.
 */
interface FindLogMessageOptions {
  logGroupName: string;
  searchString: string;
  filterPattern?: string;
  retries?: number;
  delayMs?: number;
  startTime?: number;
  endTime?: number;
}

export class LoggingDriver {
  private readonly client: TestLambdaDriver;

  constructor(client: TestLambdaDriver) {
    this.client = client;
  }

  async findLogMessageWithRetries({
    logGroupName,
    searchString,
    filterPattern = '',
    retries = 5,
    delayMs = 2000,
    startTime,
    endTime,
  }: FindLogMessageOptions): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const message = await this._findLogMessage({
        logGroupName,
        searchString,
        filterPattern,
        startTime,
        endTime,
      });

      if (message) {
        console.log(`Log message found on attempt ${attempt}`);
        return message;
      }

      console.log(
        `Attempt ${attempt} - Log message not found, retrying after ${delayMs}ms...`,
      );
      await this._sleep(delayMs);
    }

    throw new Error(
      `Log message "${searchString}" not found after ${retries} attempts.`,
    );
  }

  private async _findLogMessage({
    logGroupName,
    searchString,
    filterPattern = '',
    startTime,
    endTime,
  }: Omit<FindLogMessageOptions, 'retries' | 'delayMs'>): Promise<
    string | null
  > {
    const command = new FilterLogEventsCommand({
      logGroupName,
      filterPattern,
      startTime,
      endTime,
    });

    const response = await this.client.performAction<FilterLogEventsResponse>({
      command,
      service: 'CloudWatchLogsClient',
      action: 'FilterLogEventsCommand',
    });

    const event = response.events?.find((evt) =>
      evt.message?.includes(searchString),
    );

    return event?.message ?? null;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
