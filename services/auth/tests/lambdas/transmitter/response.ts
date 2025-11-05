import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Test lambda response utility
 * Creates a JSON response for the test transmitter lambda
 */
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
