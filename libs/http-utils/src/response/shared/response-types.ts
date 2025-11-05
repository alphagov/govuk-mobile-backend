/**
 * Shared response body configuration - allows different body structures
 */
interface ResponseBodyConfig {
  /** Creates a simple message response: { message: string } */
  message?: string;
  /** Creates custom structured response with any properties */
  data?: Record<string, unknown>;
}

/**
 * Result of processing a response body configuration
 */
interface ProcessedResponseBody {
  body: unknown;
}

export type { ResponseBodyConfig, ProcessedResponseBody };
