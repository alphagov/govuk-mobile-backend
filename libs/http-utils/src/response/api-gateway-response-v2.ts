/* eslint-disable sonarjs/function-return-type */
import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const generateResponseV2 = ({
  status,
  message,
  headers = {},
}: {
  status: number;
  message: string;
  headers?: Record<string, string>;
}): APIGatewayProxyResultV2 => {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  return {
    statusCode: status,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify({
      message,
    }),
  };
};

const generateErrorResponseV2 = ({
  status,
  message,
}: {
  status: number;
  message: string;
}): APIGatewayProxyResultV2 => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/x-amz-json-1.1' },
    body: JSON.stringify({ message }),
  };
};

export { generateResponseV2, generateErrorResponseV2 };
