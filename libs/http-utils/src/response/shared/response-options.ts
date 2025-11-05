/**
 * Base interface for common response options
 */
interface BaseResponseOptions {
  statusCode: number;
  headers?: Record<string, string>;
}

/**
 * Interface for V1 response options with base64 encoding support
 */
interface ResponseOptions extends BaseResponseOptions {
  isBase64Encoded?: boolean;
}

/**
 * Interface for V2 response options with cookies support
 */
interface ResponseOptionsV2 extends BaseResponseOptions {
  cookies?: string[];
}

/**
 * Interface for JSON response options
 */
interface JsonResponseOptions extends Omit<ResponseOptions, 'headers'> {
  headers?: Record<string, string>;
}

export type {
  BaseResponseOptions,
  ResponseOptions,
  ResponseOptionsV2,
  JsonResponseOptions,
};
