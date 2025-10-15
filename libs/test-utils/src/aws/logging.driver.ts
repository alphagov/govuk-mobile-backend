/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
  FilterLogEventsCommand,
  type FilterLogEventsResponse,
} from '@aws-sdk/client-cloudwatch-logs';
import type { TestLambdaDriver } from './testLambda.driver.js';

export interface FindLogMessageOptions {
  logGroupName: string;
  searchString: string;
  filterPattern?: string;
  retries?: number;
  delayMs?: number;
  startTime: number;
  endTime?: number;
}

export class LoggingDriver {
  private readonly client: TestLambdaDriver;

  public constructor(client: TestLambdaDriver) {
    this.client = client;
  }

  public async findLogMessageWithRetries({
    logGroupName,
    searchString,
    filterPattern = '',
    retries = 5,
    delayMs = 2000,
    startTime,
    endTime = new Date(Date.now()).getTime(),
  }: FindLogMessageOptions): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const message = await this._findLogMessage({
        logGroupName,
        searchString,
        filterPattern,
        startTime,
        endTime,
      });

      if (message != null) {
        return message;
      }

      // eslint-disable-next-line promise/avoid-new
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const event = response.events?.find((evt) =>
      evt.message?.includes(searchString),
    );
    return event?.message ?? null;
  }
}
