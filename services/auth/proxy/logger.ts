import { Logger } from '@aws-lambda-powertools/logger';
import { search } from '@aws-lambda-powertools/logger/correlationId';

export const logger = new Logger({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  serviceName: process.env['POWERTOOLS_SERVICE_NAME']!,
  correlationIdSearchFn: search,
});
