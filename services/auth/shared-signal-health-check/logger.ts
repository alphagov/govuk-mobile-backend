import { Logger } from '@aws-lambda-powertools/logger';

export const logger = new Logger({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  serviceName: process.env['POWERTOOLS_SERVICE_NAME']!,
});
