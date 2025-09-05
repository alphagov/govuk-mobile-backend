import type { APIGatewayProxyResult } from 'aws-lambda';

interface ErrorResponse {
  errorCode: string;
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

interface SETErrorResponse {
  status: number;
  errorCode: string;
  errorDescription: string;
}

const generateSETErrorResponse = (
  // error response for SET (Security Event Token)
  { status, errorCode, errorDescription }: SETErrorResponse,
): APIGatewayProxyResult => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      err: errorCode,
      description: errorDescription,
    }),
  };
};

export type { ErrorResponse };
export { generateResponse, generateSETErrorResponse as generateErrorResponse };
