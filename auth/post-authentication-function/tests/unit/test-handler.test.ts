import { PostAuthenticationTriggerEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { expect, describe, it, vi, afterAll, beforeEach } from 'vitest';

describe('Unit test for app handler', function () {
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    beforeEach(() => {
        consoleMock.mockReset();
    });
    it('verifies successful response', async () => {
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
        expect(consoleMock).toHaveBeenCalledWith('Trigger function = PostAuthentication_Authentication');
        expect(consoleMock).toHaveBeenCalledWith('Trigger function = 123');
        expect(consoleMock).toHaveBeenCalledWith('Trigger function = abc123');
        expect(consoleMock).toHaveBeenCalledWith('Trigger function = test-user');
        expect(result).toEqual(event);
    });
});
