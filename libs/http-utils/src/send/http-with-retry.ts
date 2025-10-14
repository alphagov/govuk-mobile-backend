/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Wait for a given delay
 * @param delayMillis - The delay in milliseconds
 * @returns A promise that resolves when the delay is complete
 */
async function wait(delayMillis: number): Promise<void> {
  // eslint-disable-next-line promise/avoid-new
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
}

/**
 * Retry the request with exponential backoff and full jitter
 * @param request - The request to retry
 * @param attempt - The attempt number
 * @param baseDelayMillis - The base delay in milliseconds
 * @returns The response from the request
 */
async function retryWithExponentialBackoffAndFullJitter(
  request: () => Promise<Response>,
  attempt: number,
  baseDelayMillis: number,
): Promise<Response> {
  const exponentialDelayWithoutJitter =
    Math.pow(2, attempt - 1) * baseDelayMillis;
  const exponentialDelayWithFullJitter = Math.floor(
    // eslint-disable-next-line sonarjs/pseudo-random
    Math.random() * exponentialDelayWithoutJitter,
  );
  await wait(exponentialDelayWithFullJitter);
  return await request();
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MILLIS = 100;
const DEFAULT_RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504];

interface RetryConfig {
  maxAttempts?: number;
  baseDelayMillis?: number;
  retryableStatusCodes?: number[];
  timeoutMillis?: number;
}

interface SendHttpRequestOptions {
  url: string;
  httpRequest?: RequestInit;
  retryConfig?: RetryConfig;
  signal?: AbortSignal;
}

/**
 * Send a http request with retry
 * @param input - The input to send the request
 * @param input.url - The url to send the request to
 * @param input.httpRequest - The http request to send
 * @param input.retryConfig - The retry config
 * @param input.signal - The signal to abort the request
 * @returns The response from the request
 */
const sendHttpRequest = async ({
  url,
  httpRequest = {},
  retryConfig,
  signal,
}: SendHttpRequestOptions): Promise<Response> => {
  const timeoutMillis = retryConfig?.timeoutMillis ?? 5000;
  let attempt = 0;

  // eslint-disable-next-line jsdoc/require-jsdoc
  async function request(): Promise<Response> {
    attempt++;

    const maxAttempts = retryConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseDelayMillis =
      retryConfig?.baseDelayMillis ?? DEFAULT_BASE_DELAY_MILLIS;
    const retryableStatusCodes =
      retryConfig?.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES;
    const abortSignal = signal ?? AbortSignal.timeout(timeoutMillis);

    try {
      const response = await fetch(url, {
        ...httpRequest,
        signal: abortSignal,
      });

      if (
        retryableStatusCodes.includes(response.status) &&
        attempt < maxAttempts
      ) {
        return await retryWithExponentialBackoffAndFullJitter(
          request,
          attempt,
          baseDelayMillis,
        );
      }

      return response;
    } catch (error) {
      // Do not retry if aborted
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw error;
      }

      if (attempt < maxAttempts) {
        return retryWithExponentialBackoffAndFullJitter(
          request,
          attempt,
          baseDelayMillis,
        );
      }

      // semgrep ignored because this function bubbles up the error
      throw error; // nosemgrep
    }
  }

  return await request();
};

export { sendHttpRequest };

export type { RetryConfig };
