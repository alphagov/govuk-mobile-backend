import { APIGatewayProxyEventHeaders } from 'aws-lambda';

// cognito expects consistent casing for header names e.g. x-amz-target
// host must be removed to avoid ssl hostname unrecognised errors
export const sanitiseHeaders = (headers: APIGatewayProxyEventHeaders) => {
  return Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== 'host')
    .reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value || '';
      return acc;
    }, {});
}

