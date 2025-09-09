import { time } from 'console';
import { RetryConfig, sendHttpRequest } from '../../http/http-service';
import { describe, beforeEach, expect, afterEach, it, vi } from 'vitest';

const url = 'mock_url';

const getHttpRequest = (): RequestInit => {
  return {
    method: 'GET',
    headers: {},
    body: JSON.stringify({ mock: 'request' }),
  };
};

const getRetryConfig = (): RetryConfig => {
  return {
    maxAttempts: 4,
    baseDelayMillis: 10,
    retryableStatusCodes: [503],
  };
};

const MOCK_JITTER_MULTIPLIER = 0.5;

let result;
let mockFetch: vi.SpyInstance;
let mockSetTimeout: vi.SpyInstance;

describe('sendHttpRequest', () => {
  beforeEach(() => {
    mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        status: 200,
        text: () => Promise.resolve('mock_response_string'),
        headers: new Headers({
          header1: 'mock_header1_value',
          header2: 'mock_header2_value',
        }),
      } as Response),
    );

    vi.spyOn(Math, 'random').mockImplementation(() => MOCK_JITTER_MULTIPLIER);

    mockSetTimeout = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback, _) => {
        callback();
        return {} as NodeJS.Timeout;
      });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('On every request', () => {
    beforeEach(async () => {
      result = await sendHttpRequest(url, getHttpRequest(), getRetryConfig());
    });

    it('Sends a http request using the correct parameters', async () => {
      expect(mockFetch).toHaveBeenCalledWith('mock_url', {
        method: 'GET',
        headers: {},
        body: '{"mock":"request"}',
      });
    });
  });

  describe('Given the request encounters a network error', () => {
    describe('When request succeeds within configured max attempts', () => {
      beforeEach(async () => {
        mockFetch = vi
          .spyOn(global, 'fetch')
          .mockImplementationOnce(() => {
            throw new Error('Unexpected Network error');
          })
          .mockImplementationOnce(() =>
            Promise.resolve({
              status: 200,
              text: () => Promise.resolve('mock_response_string'),
              headers: new Headers({
                header1: 'mock_header1_value',
                header2: 'mock_header2_value',
              }),
            } as Response),
          );

        result = await sendHttpRequest(url, getHttpRequest(), getRetryConfig());
      });

      it('Retries the request until success', () => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('Delays successive attempts with exponential backoff', () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it('Returns a success with details from final response', () => {
        expect(result.status).toEqual(200);
      });
    });

    describe('When request continues to fail within configured max attempts', () => {
      let error: Error;
      beforeEach(async () => {
        try {
          error = new Error('Unexpected Network error');
          mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() => {
            throw error;
          });

          result = await sendHttpRequest(
            url,
            getHttpRequest(),
            getRetryConfig(),
          );
        } catch (error) {}
      });

      it('Retries the request up to configured max attempts', () => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      it('Delays successive attempts with exponential backoff', () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          2,
          expect.any(Function),
          20 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          3,
          expect.any(Function),
          40 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it('Throws an error', async () => {
        await expect(
          sendHttpRequest(url, getHttpRequest(), getRetryConfig()),
        ).rejects.toThrow();
      });
    });
  });

  describe('Given status code is retryable ', () => {
    describe('When request succeeds within configured max attempts', () => {
      beforeEach(async () => {
        mockFetch = vi
          .spyOn(global, 'fetch')
          .mockImplementationOnce(() =>
            Promise.resolve({
              status: 503,
              text: () => Promise.resolve('mock_error_string'),
            } as Response),
          )
          .mockImplementationOnce(() =>
            Promise.resolve({
              status: 200,
              text: () => Promise.resolve('mock_response_string'),
              headers: new Headers({
                header1: 'mock_header1_value',
                header2: 'mock_header2_value',
              }),
            } as Response),
          );

        result = await sendHttpRequest(url, getHttpRequest(), getRetryConfig());
      });

      it('Retries the request until success', () => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('Delays successive attempts with exponential backoff', () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it('Returns a success with details from final response', () => {
        expect(result.status).toEqual(200);
      });
    });

    describe('When request continues to fail within configured max attempts', () => {
      beforeEach(async () => {
        mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
          Promise.resolve({
            status: 503,
            text: () => Promise.resolve('mock_error_string'),
          } as Response),
        );

        result = await sendHttpRequest(url, getHttpRequest(), getRetryConfig());
      });

      it('Retries the request up to configured max attempts', () => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      it('Delays successive attempts with exponential backoff', () => {
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          10 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          2,
          expect.any(Function),
          20 * MOCK_JITTER_MULTIPLIER,
        );
        expect(mockSetTimeout).toHaveBeenNthCalledWith(
          3,
          expect.any(Function),
          40 * MOCK_JITTER_MULTIPLIER,
        );
      });

      it('Returns a failure with details from final response', () => {
        expect(result.status).toEqual(503);
      });
    });
  });

  describe('Default retry config', () => {
    describe.each([[408], [500], [502], [503], [504]])(
      'Given the status code is %d',
      (statusCode: number) => {
        it('Makes 3 attempts with 100ms base delay', async () => {
          mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
              status: statusCode,
              text: () => Promise.resolve('mock_error_string'),
            } as Response),
          );

          await sendHttpRequest(url, getHttpRequest(), undefined);

          expect(mockFetch).toHaveBeenCalledTimes(3);
          expect(mockSetTimeout).toHaveBeenNthCalledWith(
            1,
            expect.any(Function),
            100 * MOCK_JITTER_MULTIPLIER,
          );
          expect(mockSetTimeout).toHaveBeenNthCalledWith(
            2,
            expect.any(Function),
            200 * MOCK_JITTER_MULTIPLIER,
          );
        });
      },
    );
  });

  describe('Given the status code is non-retryable and not 2xx', () => {
    describe.each([[100], [199], [300], [400], [501]])(
      'Given the status code is (%d)',
      (statusCode: number) => {
        beforeEach(async () => {
          mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
              status: statusCode,
              text: () => Promise.resolve('mock_error_string'),
            } as Response),
          );
          result = await sendHttpRequest(
            url,
            getHttpRequest(),
            getRetryConfig(),
          );
        });

        it('Does not retry the request', () => {
          expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('Returns a failure with status code and body', async () => {
          expect(result.status).toEqual(statusCode);
        });
      },
    );
  });

  describe('Given the request is successful', () => {
    describe.each([[200], [201], [299]])(
      'Given the status code is %d',
      (statusCode: number) => {
        beforeEach(async () => {
          mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
              status: statusCode,
              text: () => Promise.resolve('mock_response_string'),
              headers: new Headers({
                header1: 'mock_header1_value',
                header2: 'mock_header2_value',
              }),
            } as Response),
          );

          result = await sendHttpRequest(
            url,
            getHttpRequest(),
            getRetryConfig(),
          );
        });

        it('Does not retry the request', () => {
          expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('Returns the http response', async () => {
          expect(result.status).toEqual(statusCode);
        });
      },
    );
  });
});

describe('Given timeout is configured', () => {
  const abortControllerMock = vi.fn();
  const abortControllerSpy = vi.fn(() => ({
    signal: new EventTarget(), // A simple mock signal
    abort: abortControllerMock,
  }));
  const clearTimeout = vi.fn();

  beforeEach(async () => {
    mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        status: 416,
        text: () => Promise.resolve('mock_error_string'),
      } as Response),
    );

    vi.stubGlobal('AbortController', abortControllerSpy as any);
    vi.useFakeTimers();
    vi.stubGlobal('clearTimeout', clearTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Sends a http request using the correct parameters with timeout invoked', async () => {
    const retryConfig: RetryConfig = {
      timeout: 100,
    };

    result = await sendHttpRequest(url, getHttpRequest(), retryConfig);

    vi.advanceTimersByTime(1000);
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
        body: '{"mock":"request"}',
        headers: {},
      }),
    );
    expect(result.status).toEqual(416); //timeout status code
    expect(abortControllerSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeout).toHaveBeenCalledWith(retryConfig?.timeout); //clear timeout is invoked
  });
});
