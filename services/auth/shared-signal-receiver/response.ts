import type { APIGatewayProxyResult } from 'aws-lambda';

export const generateResponse = (
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
