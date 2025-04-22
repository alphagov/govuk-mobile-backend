import { PreAuthenticationTriggerEvent } from 'aws-lambda';
import { expect, describe, it } from 'vitest'
import { handler } from '../../app';

describe('PreAuthentication Lambda', () => {
  it('should log the event and allow authentication by returning the event', async () => {
    const event: PreAuthenticationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_xxxxxxxxx',
      userName: 'testuser',
      callerContext: {
        awsSdkVersion: 'aws-sdk-js-2.1093.0',
        clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxx'
      },
      request: {
        userAttributes: {
          email: 'test@example.com'
        },
      },
      triggerSource: 'PreAuthentication_Authentication',
      response: {}
    };

    const result = await handler(event, {} as unknown as any, () => {});

    expect(result).toEqual(event); // Should return the original event to allow authentication
  });
})