import type { APIGatewayProxyResult } from 'aws-lambda';
import type { SETErrorResponse } from './types';

const generateResponse = ({
  status,
  message,
  headers,
}: {
  status: number;
  message: string;
  headers?: Record<string, string>;
}): APIGatewayProxyResult => {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  return {
    statusCode: status,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify({
      message,
    }),
  };
};

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

export { generateResponse, generateSETErrorResponse as generateErrorResponse };
