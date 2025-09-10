/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Waits for the specified number of milliseconds before resolving.
 * @param delayMillis The number of milliseconds to wait before resolving.
 */
async function wait(delayMillis: number): Promise<void> {
  // eslint-disable-next-line promise/avoid-new
  await new Promise((resolve) => setTimeout(resolve, delayMillis));
}

/**
 *
 * @param request
 * @param attempt
 * @param baseDelayMillis
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
  timeoutInMs?: number;
}

const clearTimeout = (timeout: NodeJS.Timeout | undefined): void => {
  if (timeout !== undefined) {
    global.clearTimeout(timeout);
  }
};

const sendHttpRequest = async (
  url: string,
  httpRequest: RequestInit,
  retryConfig?: RetryConfig,
  fetchingMechanism: (
    url: string,
    httpRequest: RequestInit,
  ) => Promise<Response> = fetch,
): Promise<Response> => {
  let attempt = 0;

  // eslint-disable-next-line jsdoc/require-jsdoc
  async function request(): Promise<Response> {
    attempt++;

    const maxAttempts = retryConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseDelayMillis =
      retryConfig?.baseDelayMillis ?? DEFAULT_BASE_DELAY_MILLIS;
    const retryableStatusCodes =
      retryConfig?.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES;

    const timeoutInMs = retryConfig?.timeoutInMs ?? 5000;

    let timeoutId: NodeJS.Timeout | undefined = undefined;
    try {
      let response = undefined;
      const controller = new AbortController();
      httpRequest.signal = controller.signal;
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutInMs);
      response = await fetchingMechanism(url, httpRequest);

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
      clearTimeout(timeoutId);
      if (attempt < maxAttempts) {
        return await retryWithExponentialBackoffAndFullJitter(
          request,
          attempt,
          baseDelayMillis,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return await request();
};

export { sendHttpRequest };

export type { RetryConfig };
