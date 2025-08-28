import type { APIGatewayProxyResult } from 'aws-lambda';

export const generateResponse = (
  status: number,
  message: any,
): APIGatewayProxyResult => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  };
};
