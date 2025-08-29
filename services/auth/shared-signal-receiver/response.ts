import type { APIGatewayProxyResult } from 'aws-lambda';

interface ErrorResponse {
  errorCode: string | null;
  errorDescription: string;
}

const generateResponse = (
  status: number,
  message: string,
): APIGatewayProxyResult => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
    }),
  };
};

const generateSETErrorResponse = (
  // error response for SET (Security Event Token)
  status: number,
  error: ErrorResponse,
): APIGatewayProxyResult => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      err: error.errorCode,
      description: error.errorDescription,
    }),
  };
};

export type { ErrorResponse };
export { generateResponse, generateSETErrorResponse as generateErrorResponse };
