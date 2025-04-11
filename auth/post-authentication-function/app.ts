import { PostAuthenticationTriggerEvent } from 'aws-lambda';

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
    console.log(`Trigger function = ${event.triggerSource}`);
    console.log(`Trigger function = ${event.userPoolId}`);
    console.log(`Trigger function = ${event.callerContext.clientId}`);
    console.log(`Trigger function = ${event.userName}`);
    return event;
};
