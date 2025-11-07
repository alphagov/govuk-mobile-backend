interface SETErrorResponse {
  status: number;
  errorCode: string;
  errorDescription: string;
}

interface ErrorResponse {
  errorCode: string;
  errorDescription: string;
}

export type { SETErrorResponse, ErrorResponse };
