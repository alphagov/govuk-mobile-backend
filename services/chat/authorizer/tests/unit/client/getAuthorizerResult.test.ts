import { describe, it, expect } from 'vitest';
import { getAuthorizerResult } from '../../../client/getAuthorizerResult';

describe('getAuthorizerResult', () => {
  it('should return the correct authorizer result', () => {
    const result = getAuthorizerResult('user-123', 'Allow', 'token');
    expect(result).toEqual({
      principalId: 'user-123',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Action: 'execute-api:Invoke', Resource: '*' },
        ],
      },
      context: {
        bearerToken: 'Bearer token',
        'Govuk-Chat-End-User-Id': 'user-123',
      },
    });
  });

  it('should return the correct authorizer result when the effect is Deny', () => {
    const result = getAuthorizerResult('user-123', 'Deny', 'token');
    expect(result).toEqual({
      principalId: 'user-123',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Deny', Action: 'execute-api:Invoke', Resource: '*' },
        ],
      },
      context: {
        bearerToken: 'Bearer token',
        'Govuk-Chat-End-User-Id': 'user-123',
      },
    });
  });
});
