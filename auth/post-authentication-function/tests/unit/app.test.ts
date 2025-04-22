import { PostAuthenticationTriggerEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { expect, describe, it, vi, afterAll, beforeEach } from 'vitest';

describe('Unit test for post-authentication handler', function () {
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    beforeEach(() => {
        consoleMock.mockReset();
    });
    it('Handler logs user information', async () => {
        const event: PostAuthenticationTriggerEvent = {
            triggerSource: 'PostAuthentication_Authentication',
            version: '1',
            region: 'eu-west-2',
            userPoolId: '123',
            userName: 'test-user',
            callerContext: {
                awsSdkVersion: '1',
                clientId: 'abc123',
            },
            request: {
                userAttributes: {},
                newDeviceUsed: false,
                clientMetadata: {},
            },
            response: {},
        };

        const result: PostAuthenticationTriggerEvent = await lambdaHandler(event);

        expect(consoleMock).toHaveBeenCalledWith('Source = PostAuthentication_Authentication');
        expect(consoleMock).toHaveBeenCalledWith('User Pool Id = 123');
        expect(consoleMock).toHaveBeenCalledWith('Client Id = abc123');
        expect(consoleMock).toHaveBeenCalledWith('Username = test-user');
        expect(result).toEqual(event);
    });
});
