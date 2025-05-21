import type { PostAuthenticationTriggerEvent } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 * @returns {Object} object - Post Authentication Trigger Event
 *
 */

export const lambdaHandler = async (event: PostAuthenticationTriggerEvent): Promise<PostAuthenticationTriggerEvent> => {
    console.log(`Source = ${event.triggerSource}`);
    console.log(`User Pool Id = ${event.userPoolId}`);
    console.log(`Client Id = ${event.callerContext.clientId}`);
    console.log(`Username = ${event.userName}`);
    return event;
};
